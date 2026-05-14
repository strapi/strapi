import { waitForElementToBeRemoved } from '@testing-library/react';
import { render as renderRTL, waitFor, server, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { StageSelect } from '../StageSelect';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocument: jest.fn().mockReturnValue({
    document: {
      documentId: '12345',
      id: 12345,
      ['strapi_stage']: {
        id: 1,
        color: '#4945FF',
        name: 'Stage 1',
      },
    },
  }),
}));

describe('StageSelect', () => {
  const render = () =>
    renderRTL(<StageSelect />, {
      renderOptions: {
        wrapper: ({ children }) => {
          return (
            <Routes>
              <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
            </Routes>
          );
        },
      },
      initialEntries: ['/content-manager/collection-types/api::address.address/1234'],
    });

  it('renders a select input, if a workflow stage is assigned to the entity', async () => {
    const { user } = render();

    await waitForElementToBeRemoved(() => screen.queryByTestId('loader'));

    await screen.findByRole('combobox');

    expect(screen.getByRole('combobox')).toHaveTextContent('Stage 1');

    await user.click(screen.getByRole('combobox'));

    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it("renders the select as disabled with a hint, if there aren't any stages", async () => {
    server.use(
      http.get(
        '/review-workflows/content-manager/:collectionType/:contentType/:id/stages',
        () => HttpResponse.json({ data: [] }),
        { once: true }
      )
    );

    render();

    await waitForElementToBeRemoved(() => screen.queryByTestId('loader'));

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
    );
    await screen.findByText('You don’t have the permission to update this stage.');
  });

  it('shows the single-stage hint when the workflow has one stage (empty options but meta says so)', async () => {
    server.use(
      http.get(
        '/review-workflows/content-manager/:collectionType/:contentType/:id/stages',
        () =>
          HttpResponse.json({
            data: [],
            meta: {
              workflowCount: 1,
              stageCount: 1,
              canTransition: true,
            },
          }),
        { once: true }
      )
    );

    render();

    await waitForElementToBeRemoved(() => screen.queryByTestId('loader'));

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
    );
    // Matches `defaultMessage` in `StageSelect.tsx`; full `en.json` copy may differ in the app.
    await screen.findByText(
      'This workflow only has one stage. Add more stages to be able to update it here.'
    );
  });

  it('shows the no-permission hint when there are multiple stages but the user cannot transition', async () => {
    server.use(
      http.get(
        '/review-workflows/content-manager/:collectionType/:contentType/:id/stages',
        () =>
          HttpResponse.json({
            data: [],
            meta: {
              workflowCount: 1,
              stageCount: 3,
              canTransition: false,
            },
          }),
        { once: true }
      )
    );

    render();

    await waitForElementToBeRemoved(() => screen.queryByTestId('loader'));

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
    );
    await screen.findByText('You don’t have the permission to update this stage.');
  });
});
