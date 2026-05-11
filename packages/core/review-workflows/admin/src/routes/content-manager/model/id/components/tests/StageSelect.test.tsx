import { waitForElementToBeRemoved } from '@testing-library/react';
import { render as renderRTL, waitFor, server, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { StageSelect } from '../StageSelect';

const defaultDocument = {
  document: {
    documentId: '12345',
    id: 12345,
    ['strapi_stage']: {
      id: 1,
      color: '#4945FF',
      name: 'Stage 1',
    },
  },
};

const useDocumentMock = jest.fn().mockReturnValue(defaultDocument);

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  get unstable_useDocument() {
    return useDocumentMock;
  },
}));

afterEach(() => {
  useDocumentMock.mockReturnValue(defaultDocument);
});

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
      http.get('*/content-manager/:kind/:uid/:id/stages', () => HttpResponse.json({ data: [] }), {
        once: true,
      })
    );

    render();

    await waitForElementToBeRemoved(() => screen.queryByTestId('loader'));

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
    );
    await screen.findByText('You don’t have the permission to update this stage.');
  });

  it('renders the select as disabled with a "save first" hint when the locale entry does not exist yet', async () => {
    useDocumentMock.mockReturnValue({ document: undefined });

    server.use(
      rest.get('*/content-manager/:kind/:uid/:id/stages', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: [],
            meta: { workflowCount: 1, stageCount: 2 },
          })
        );
      })
    );

    render();

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
    );
    await screen.findByText('Save this entry to assign a workflow stage.');
    expect(
      screen.queryByText('You don’t have the permission to update this stage.')
    ).not.toBeInTheDocument();
  });
});
