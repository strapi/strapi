import { fireEvent } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { EditPage } from '../id';

const WORKFLOW_LIMIT_TITLE = 'You’ve reached the limit of workflows in your plan';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
  })),
}));

jest.mock('@strapi/admin/strapi-admin/ee', () => {
  // The real hook returns the same feature options until the license is refetched.
  const reviewWorkflowsLimits = { numberOfWorkflows: '2', stagesPerWorkflow: '10' };

  return {
    ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
    useLicenseLimits: jest.fn(() => ({
      isLoading: false,
      getFeature: () => reviewWorkflowsLimits,
    })),
  };
});

const createWorkflow = (id: number) => ({
  id,
  name: `Workflow ${id}`,
  contentTypes: [],
  stageRequiredToPublish: null,
  stages: [
    {
      id,
      name: 'To Review',
      color: '#4945FF',
      permissions: [],
    },
  ],
});

const setup = (id: string) =>
  render(
    <Routes>
      <Route path="/settings/review-workflows/:id" element={<EditPage />} />
    </Routes>,
    { initialEntries: [`/settings/review-workflows/${id}`] }
  );

describe('Review workflows | EditPage | workflow limit', () => {
  let workflowsRequestCount = 0;
  /**
   * The instance holds more workflows than the license allows, e.g. after a downgrade.
   */
  let workflows = [createWorkflow(1), createWorkflow(2), createWorkflow(3)];

  beforeEach(() => {
    workflowsRequestCount = 0;
    workflows = [createWorkflow(1), createWorkflow(2), createWorkflow(3)];

    server.use(
      http.get('/review-workflows/workflows', () => {
        workflowsRequestCount += 1;

        return HttpResponse.json({
          data: workflows,
          meta: { workflowCount: workflows.length },
        });
      }),
      http.put('/review-workflows/workflows/:id', async ({ params, request }) => {
        const { data } = (await request.json()) as { data: { name: string } };
        const id = Number(params.id);

        // Persist the update, so the refetch after the save returns a changed workflow.
        workflows = workflows.map((workflow) =>
          workflow.id === id ? { ...workflow, name: data.name } : workflow
        );

        return HttpResponse.json({ data: workflows.find((workflow) => workflow.id === id) });
      }),
      http.get('/admin/roles', () => HttpResponse.json({ data: [] }))
    );
  });

  it('does not open the workflow limit modal when a workflow above the limit is saved and refetched', async () => {
    setup('1');

    const nameInput = await screen.findByRole('textbox', { name: /workflow name/i });

    expect(screen.queryByText(WORKFLOW_LIMIT_TITLE)).not.toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Renamed workflow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Updated workflow');
    await waitFor(() => expect(workflowsRequestCount).toBe(2));

    expect(screen.queryByText(WORKFLOW_LIMIT_TITLE)).not.toBeInTheDocument();
  });

  it('opens the workflow limit modal on the create route above the limit', async () => {
    setup('create');

    expect(await screen.findByText(WORKFLOW_LIMIT_TITLE)).toBeInTheDocument();
  });
});
