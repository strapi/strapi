import * as React from 'react';

import {
  defaultTestStoreConfig,
  render,
  screen,
  server,
  waitFor,
} from '@strapi/admin/strapi-admin/test';
import { http, HttpResponse } from 'msw';
import { useSelector } from 'react-redux';

import { CTBSessionProvider } from '../../CTBSession/CTBSessionProvider';
import { FormModalNavigationProvider } from '../../FormModalNavigation/FormModalNavigationProvider';
import DataManagerProvider from '../DataManagerProvider';
import { reducer, type State } from '../reducer';
import { useDataManager } from '../useDataManager';

import type { ContentType } from '../../../types';
import type { AttributeRenameMigrationMode } from '../RenameMigrationModal';

const UID = 'api::article.article';

const articleSchema = {
  uid: UID,
  modelType: 'contentType',
  kind: 'collectionType',
  modelName: 'article',
  globalId: 'Article',
  visible: true,
  restrictRelationsTo: null,
  info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
  options: {},
  attributes: [
    { name: 'title', type: 'string' },
    { name: 'body', type: 'text' },
  ],
};

const mockSchema = (mode: AttributeRenameMigrationMode) => {
  server.use(
    http.get('/content-type-builder/schema', () =>
      HttpResponse.json({
        data: {
          contentTypes: { [UID]: articleSchema },
          components: {},
          settings: { renameMigrations: { attributes: mode } },
        },
      })
    ),
    http.get('/content-type-builder/reserved-names', () =>
      HttpResponse.json({ models: [], attributes: [] })
    )
  );
};

/**
 * Drives the provider the way FormModal and the AI chat do: each click on
 * "rename" performs the next hop through `confirmAttributeRenameMigration`
 * and applies the decision with `editAttribute` (one submit per render, like
 * the form); "apply" sends a whole-type change through `applyChange`; "add"
 * creates `newAttribute` as an unsaved (NEW) field with `addAttribute`.
 */
const Harness = ({
  hops,
  change,
  newAttribute,
}: {
  hops: Array<{ oldName: string; newName: string }>;
  change?: Partial<ContentType>;
  newAttribute?: Record<string, unknown>;
}) => {
  const {
    contentTypes,
    confirmAttributeRenameMigration,
    addAttribute,
    editAttribute,
    applyChange,
    isLoading,
  } = useDataManager();
  const [step, setStep] = React.useState(0);
  const [log, setLog] = React.useState<string[]>([]);
  const [applied, setApplied] = React.useState<boolean | null>(null);

  const rename = async () => {
    const hop = hops[step];
    setStep(step + 1);

    const decision = await confirmAttributeRenameMigration({
      forTarget: 'contentType',
      uid: UID,
      ...hop,
    });
    setLog((previous) => [...previous, `${hop.oldName}->${hop.newName}:${decision}`]);
    if (decision === null) {
      return;
    }
    const attribute = contentTypes[UID].attributes.find((attr) => attr.name === hop.oldName);
    editAttribute({
      forTarget: 'contentType',
      targetUid: UID,
      name: hop.oldName,
      attributeToSet: { ...attribute, name: hop.newName },
      recordRename: decision,
      declineRename: !decision,
    });
  };

  const apply = async () => {
    const current = contentTypes[UID];
    const result = await applyChange({
      action: 'update',
      schema: { ...current, ...change } as ContentType,
    });
    setApplied(result);
  };

  if (isLoading) {
    return <p>loading</p>;
  }

  return (
    <div>
      <button type="button" onClick={rename}>
        rename
      </button>
      <button type="button" onClick={apply}>
        apply
      </button>
      <button
        type="button"
        onClick={() =>
          newAttribute &&
          addAttribute({ forTarget: 'contentType', targetUid: UID, attributeToSet: newAttribute })
        }
      >
        add
      </button>
      <ul>
        {log.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
      <p>applied:{String(applied)}</p>
    </div>
  );
};

let latestState: State | undefined;
const StateSpy = () => {
  latestState = useSelector(
    (state: Record<string, unknown>) => state['content-type-builder_dataManagerProvider'] as State
  );
  return null;
};

const setup = (mode: AttributeRenameMigrationMode, props: React.ComponentProps<typeof Harness>) => {
  mockSchema(mode);
  latestState = undefined;

  const base = defaultTestStoreConfig();
  const utils = render(
    <CTBSessionProvider>
      <FormModalNavigationProvider>
        <DataManagerProvider>
          <StateSpy />
          <Harness {...props} />
        </DataManagerProvider>
      </FormModalNavigationProvider>
    </CTBSessionProvider>,
    {
      providerOptions: {
        storeConfig: {
          ...base,
          reducer: { ...base.reducer, 'content-type-builder_dataManagerProvider': reducer },
        },
      },
    }
  );

  return utils;
};

const article = () => latestState?.current.contentTypes[UID];

describe('CTB | DataManagerProvider | rename consent', () => {
  // This package has no global MSW setup; scope the mock server to this file.
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('prompt-after-edit: consent inherits along a chain', () => {
    it('prompts once for a chain and accepts its continuation silently', async () => {
      const { user } = setup('prompt-after-edit', {
        hops: [
          { oldName: 'title', newName: 'tmp' },
          { oldName: 'tmp', newName: 'heading' },
        ],
      });
      await screen.findByRole('button', { name: 'rename' });

      // First hop prompts.
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(await screen.findByRole('button', { name: 'Preserve data' }));
      await screen.findByText('title->tmp:true');

      // Second hop is accepted without a prompt.
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await screen.findByText('tmp->heading:true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      expect(article()?.renames).toEqual([
        { oldName: 'title', newName: 'tmp' },
        { oldName: 'tmp', newName: 'heading' },
      ]);
      expect(article()?.declinedRenameNames).toBeUndefined();
    });

    it('declines the rest of a chain silently once its first hop was declined', async () => {
      const { user } = setup('prompt-after-edit', {
        hops: [
          { oldName: 'title', newName: 'tmp' },
          { oldName: 'tmp', newName: 'heading' },
        ],
      });
      await screen.findByRole('button', { name: 'rename' });

      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(await screen.findByRole('button', { name: "Don't preserve data" }));
      await screen.findByText('title->tmp:false');

      await user.click(screen.getByRole('button', { name: 'rename' }));
      await screen.findByText('tmp->heading:false');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      expect(article()?.renames).toBeUndefined();
      expect(article()?.declinedRenameNames).toEqual(['title', 'tmp', 'heading']);
    });

    it('never records a partial swap: a decline in the middle declines the whole chain', async () => {
      const { user } = setup('prompt-after-edit', {
        hops: [
          { oldName: 'title', newName: 'tmp' },
          { oldName: 'body', newName: 'title' },
          { oldName: 'tmp', newName: 'body' },
        ],
      });
      await screen.findByRole('button', { name: 'rename' });

      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(await screen.findByRole('button', { name: "Don't preserve data" }));
      await screen.findByText('title->tmp:false');

      // `body -> title` swaps into a declined name and `tmp -> body` continues
      // the declined chain: neither prompts, nothing is recorded.
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await screen.findByText('body->title:false');
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await screen.findByText('tmp->body:false');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(article()?.renames).toBeUndefined();
      expect(article()?.declinedRenameNames).toEqual(['title', 'tmp', 'body']);
    });

    it('accepts a swap into a name an accepted chain vacated without prompting', async () => {
      const { user } = setup('prompt-after-edit', {
        hops: [
          { oldName: 'title', newName: 'tmp' },
          { oldName: 'body', newName: 'title' },
          { oldName: 'tmp', newName: 'body' },
        ],
      });
      await screen.findByRole('button', { name: 'rename' });

      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(await screen.findByRole('button', { name: 'Preserve data' }));
      await screen.findByText('title->tmp:true');

      await user.click(screen.getByRole('button', { name: 'rename' }));
      await screen.findByText('body->title:true');
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await screen.findByText('tmp->body:true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(article()?.renames).toEqual([
        { oldName: 'title', newName: 'tmp' },
        { oldName: 'body', newName: 'title' },
        { oldName: 'tmp', newName: 'body' },
      ]);
    });

    it('returns null when the user cancels the edit', async () => {
      const { user } = setup('prompt-after-edit', {
        hops: [{ oldName: 'title', newName: 'tmp' }],
      });
      await screen.findByRole('button', { name: 'rename' });

      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(await screen.findByRole('button', { name: 'Cancel' }));

      await screen.findByText('title->tmp:null');
      expect(article()?.renames).toBeUndefined();
      expect(article()?.declinedRenameNames).toBeUndefined();
    });
  });

  describe('prompt-after-edit: unsaved (NEW) fields', () => {
    it('never prompts for and never declines a rename of a NEW field', async () => {
      const { user } = setup('prompt-after-edit', {
        newAttribute: { name: 'summary', type: 'string' },
        hops: [
          { oldName: 'summary', newName: 'draft' },
          { oldName: 'body', newName: 'summary' },
        ],
      });
      await screen.findByRole('button', { name: 'add' });

      await user.click(screen.getByRole('button', { name: 'add' }));
      await waitFor(() =>
        expect(article()?.attributes.find((attr) => attr.name === 'summary')?.status).toBe('NEW')
      );

      // Renaming the NEW field is accepted without a prompt and records nothing.
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await screen.findByText('summary->draft:true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(article()?.renames).toBeUndefined();
      expect(article()?.declinedRenameNames).toBeUndefined();

      // A saved field renamed onto the name the NEW field vacated still prompts,
      // rather than being declined silently.
      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(await screen.findByRole('button', { name: 'Preserve data' }));
      await screen.findByText('body->summary:true');
      expect(article()?.renames).toEqual([{ oldName: 'body', newName: 'summary' }]);
      expect(article()?.declinedRenameNames).toBeUndefined();
    });
  });

  describe('applyChange (AI chat)', () => {
    it("strips rename hops in 'never' mode", async () => {
      const { user } = setup('never', {
        hops: [],
        change: {
          attributes: [
            { name: 'heading', type: 'string', status: 'CHANGED' },
            { name: 'body', type: 'text', status: 'UNCHANGED' },
          ],
          renames: [{ oldName: 'title', newName: 'heading' }],
        },
      });
      await screen.findByRole('button', { name: 'apply' });

      await user.click(screen.getByRole('button', { name: 'apply' }));

      await screen.findByText('applied:true');
      expect(article()?.renames).toBeUndefined();
      expect(article()?.attributes.map((attr) => attr.name)).toEqual(['heading', 'body']);
    });

    it("applies rename hops as-is in 'prompt-before-save' mode", async () => {
      const { user } = setup('prompt-before-save', {
        hops: [],
        change: {
          attributes: [{ name: 'heading', type: 'string', status: 'CHANGED' }],
          renames: [{ oldName: 'title', newName: 'heading' }],
        },
      });
      await screen.findByRole('button', { name: 'apply' });

      await user.click(screen.getByRole('button', { name: 'apply' }));

      await screen.findByText('applied:true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(article()?.renames).toEqual([{ oldName: 'title', newName: 'heading' }]);
    });

    it("prompts once per undecided chain in 'prompt-after-edit' mode and merges the decision", async () => {
      const { user } = setup('prompt-after-edit', {
        // `title -> tmp` is accepted by hand first, so the AI's `tmp -> heading`
        // inherits that consent and only `body -> content` needs a prompt.
        hops: [{ oldName: 'title', newName: 'tmp' }],
        change: {
          attributes: [
            { name: 'heading', type: 'string', status: 'CHANGED' },
            { name: 'content', type: 'text', status: 'CHANGED' },
          ],
          renames: [
            { oldName: 'tmp', newName: 'heading' },
            { oldName: 'body', newName: 'content' },
          ],
        },
      });
      await screen.findByRole('button', { name: 'rename' });

      await user.click(screen.getByRole('button', { name: 'rename' }));
      await user.click(await screen.findByRole('button', { name: 'Preserve data' }));
      await screen.findByText('title->tmp:true');

      await user.click(screen.getByRole('button', { name: 'apply' }));

      // Only the `body` chain is listed.
      const dialog = await screen.findByRole('dialog');
      expect(screen.getAllByRole('checkbox')).toHaveLength(1);
      expect(screen.getByRole('checkbox', { name: 'Preserve data of body' })).toBeChecked();
      expect(dialog).not.toHaveTextContent('tmp');

      await user.click(screen.getByRole('button', { name: "Don't preserve data" }));

      await screen.findByText('applied:true');
      expect(article()?.renames).toEqual([
        { oldName: 'title', newName: 'tmp' },
        { oldName: 'tmp', newName: 'heading' },
      ]);
      expect(article()?.declinedRenameNames).toEqual(['body', 'content']);
    });

    it('applies nothing when the user cancels the prompt', async () => {
      const { user } = setup('prompt-after-edit', {
        hops: [],
        change: {
          attributes: [{ name: 'heading', type: 'string', status: 'CHANGED' }],
          renames: [{ oldName: 'title', newName: 'heading' }],
        },
      });
      await screen.findByRole('button', { name: 'apply' });

      await user.click(screen.getByRole('button', { name: 'apply' }));
      await user.click(await screen.findByRole('button', { name: 'Cancel' }));

      await screen.findByText('applied:false');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(article()?.renames).toBeUndefined();
      expect(article()?.attributes.map((attr) => attr.name)).toEqual(['title', 'body']);
    });
  });
});
