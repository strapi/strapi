import {
  getWorkflowChanges,
  registerAuditEvents,
  toWorkflowSnapshot,
  type WorkflowRow,
} from '../audit-logs';

const findOne = jest.fn();
const strapi = { db: { query: jest.fn(() => ({ findOne })) } } as any;

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerAuditEvents(
    { strapi },
    {
      registerEvent(name: string, transform: any) {
        transformers[name] = transform;
      },
    }
  );

  return transformers;
};

const permission = (direction: 'from' | 'to', roleName: string) => ({
  action: 'admin::review-workflows.stage.transition',
  actionParameters: { [direction]: 1 },
  role: { id: 1, name: roleName },
});

const workflowRow: WorkflowRow = {
  id: 1,
  name: 'Editorial',
  contentTypes: ['api::page.page', 'api::article.article'],
  stages: [
    {
      name: 'Draft',
      color: '#4945FF',
      permissions: [permission('from', 'Super Admin'), permission('from', 'Editor')],
    },
    {
      name: 'Done',
      color: null,
      permissions: [permission('to', 'Super Admin'), permission('from', 'Super Admin')],
    },
  ],
  stageRequiredToPublish: { name: 'Done' },
};

const snapshot = toWorkflowSnapshot(workflowRow);

describe('toWorkflowSnapshot', () => {
  test('sorts content types and role names, and reads the required stage by name', () => {
    expect(snapshot).toEqual({
      name: 'Editorial',
      contentTypes: ['api::article.article', 'api::page.page'],
      stages: [
        {
          name: 'Draft',
          color: '#4945FF',
          fromPermissions: ['Editor', 'Super Admin'],
          toPermissions: [],
        },
        {
          name: 'Done',
          color: null,
          fromPermissions: ['Super Admin'],
          toPermissions: ['Super Admin'],
        },
      ],
      stageRequiredToPublish: 'Done',
    });
  });

  test('defaults missing relations to empty', () => {
    expect(toWorkflowSnapshot({ id: 2, name: 'Empty' })).toEqual({
      name: 'Empty',
      contentTypes: [],
      stages: [],
      stageRequiredToPublish: null,
    });
  });
});

describe('getWorkflowChanges', () => {
  test('no changes when the snapshots are equal', () => {
    expect(getWorkflowChanges(snapshot, toWorkflowSnapshot(workflowRow))).toEqual({});
  });

  test('content type order alone is not a change', () => {
    const reordered = toWorkflowSnapshot({
      ...workflowRow,
      contentTypes: ['api::article.article', 'api::page.page'],
    });

    expect(getWorkflowChanges(snapshot, reordered)).toEqual({});
  });

  test('stage order is a change', () => {
    const reordered = { ...snapshot, stages: [snapshot.stages[1], snapshot.stages[0]] };

    expect(getWorkflowChanges(snapshot, reordered)).toEqual({
      stages: { before: snapshot.stages, after: reordered.stages },
    });
  });

  test('records only the fields that changed', () => {
    const next = { ...snapshot, name: 'Marketing', stageRequiredToPublish: null };

    expect(getWorkflowChanges(snapshot, next)).toEqual({
      name: { before: 'Editorial', after: 'Marketing' },
      stageRequiredToPublish: { before: 'Done', after: null },
    });
  });
});

describe('review workflow audit events', () => {
  beforeEach(() => {
    findOne.mockReset();
  });

  test('registers the five events', () => {
    expect(Object.keys(getTransformers()).sort()).toEqual([
      'entry.assignee.update',
      'review-workflows.updateEntryStage',
      'workflow.create',
      'workflow.delete',
      'workflow.update',
    ]);
  });

  test('workflow.create', () => {
    const { name, ...details } = snapshot;

    expect(getTransformers()['workflow.create']({ workflowId: 1, name, ...details })).toEqual({
      resource: { type: 'workflow', id: 1, name: 'Editorial' },
      details,
    });
  });

  test('workflow.update', () => {
    const changes = { name: { before: 'Editorial', after: 'Marketing' } };

    expect(
      getTransformers()['workflow.update']({ workflowId: 1, name: 'Marketing', changes })
    ).toEqual({
      resource: { type: 'workflow', id: 1, name: 'Marketing' },
      details: { changes },
    });
  });

  test('workflow.delete', () => {
    expect(getTransformers()['workflow.delete']({ workflowId: 1, name: 'Editorial' })).toEqual({
      resource: { type: 'workflow', id: 1, name: 'Editorial' },
    });
  });

  test('entry.assignee.update', () => {
    expect(
      getTransformers()['entry.assignee.update']({
        uid: 'api::article.article',
        documentId: 'doc1',
        locale: 'en',
        changes: { assignee: { before: 3, after: null } },
      })
    ).toEqual({
      resource: { type: 'entry', uid: 'api::article.article', id: 'doc1' },
      details: { locale: 'en', changes: { assignee: { before: 3, after: null } } },
    });
  });

  const stageEvent = {
    model: 'article',
    uid: 'api::article.article',
    entity: { id: 7, documentId: 'doc1', locale: 'en', status: 'draft' },
    workflow: {
      id: 1,
      stages: { from: { id: 1, name: 'Draft' }, to: { id: 2, name: 'Review' } },
    },
  };

  test('review-workflows.updateEntryStage reads the workflow name', async () => {
    findOne.mockResolvedValue({ name: 'Editorial' });

    await expect(
      getTransformers()['review-workflows.updateEntryStage'](stageEvent)
    ).resolves.toEqual({
      resource: { type: 'entry', uid: 'api::article.article', id: 'doc1' },
      details: {
        locale: 'en',
        workflow: { id: 1, name: 'Editorial' },
        changes: { stage: { before: { id: 1, name: 'Draft' }, after: { id: 2, name: 'Review' } } },
      },
    });
    expect(strapi.db.query).toHaveBeenCalledWith('plugin::review-workflows.workflow');
    expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, select: ['name'] });
  });

  test('review-workflows.updateEntryStage without the workflow row or a locale', async () => {
    findOne.mockResolvedValue(null);

    const shape = await getTransformers()['review-workflows.updateEntryStage']({
      ...stageEvent,
      entity: { id: 7, documentId: 'doc1' },
    });

    expect(shape.details).toMatchObject({ locale: null, workflow: { id: 1, name: null } });
  });
});
