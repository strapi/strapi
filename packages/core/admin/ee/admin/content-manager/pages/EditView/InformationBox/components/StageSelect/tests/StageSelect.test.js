import React from 'react';

import { waitForElementToBeRemoved } from '@testing-library/react';
import { render, waitFor, server } from '@tests/utils';
import { rest } from 'msw';

import { StageSelect } from '../StageSelect';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockReturnValue({
    initialData: {
      id: 1,
      strapi_stage: {
        id: 1,
        color: '#4945FF',
        name: 'Stage 1',
      },
    },
    isCreatingEntry: false,
    isSingleType: false,
    layout: { uid: 'api::articles:articles' },
  }),
}));

describe('EE | Content Manager | EditView | InformationBox | StageSelect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a select input, if a workflow stage is assigned to the entity', async () => {
    const { queryByRole, getByTestId, getByText, user } = render(<StageSelect />);

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await waitFor(() => expect(getByText('Stage 1')).toBeInTheDocument());

    await user.click(queryByRole('combobox'));

    await waitFor(() => expect(getByText('Stage 2')).toBeInTheDocument());
  });

  it("renders the select as disabled with a hint, if there aren't any stages", async () => {
    server.use(
      rest.get('*/content-manager/:kind/:uid/:id/stages', (req, res, ctx) => {
        return res.once(ctx.json({ data: [] }));
      })
    );

    const { queryByRole, getByText, getByTestId } = render(<StageSelect />);

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await waitFor(() => expect(queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true'));
    await waitFor(() =>
      expect(getByText('You don’t have the permission to update this stage.')).toBeInTheDocument()
    );
  });
});
