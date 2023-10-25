import React from 'react';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render as renderRTL, waitFor } from '@tests/utils';

import { STAGE_ATTRIBUTE_NAME, ASSIGNEE_ATTRIBUTE_NAME } from '../constants';
import { InformationBoxEE } from '../InformationBoxEE';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
}));

const render = (props) => renderRTL(<InformationBoxEE {...props} />);

describe('EE | Content Manager | EditView | InformationBox', () => {
  it('renders the title and body of the Information component', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      isCreatingEntry: true,
      layout: {
        options: {
          reviewWorkflows: false,
        },
      },
    });

    const { getByText } = render();

    await waitFor(() => expect(getByText('Information')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Last update')).toBeInTheDocument());
  });

  it('renders neither stage nor assignee select inputs, if no nothing is returned for an entity', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      layout: {
        options: {
          reviewWorkflows: false,
        },
      },
    });

    const { queryByRole } = render();

    await waitFor(() => expect(queryByRole('combobox')).not.toBeInTheDocument());
  });

  it('renders stage and assignee select inputs, if both are set on an entity', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: {
          id: 1,
          color: '#4945FF',
          name: 'Stage 1',
          worklow: 1,
        },

        [ASSIGNEE_ATTRIBUTE_NAME]: {
          id: 1,
          firstname: 'Firstname',
        },
      },
      layout: {
        uid: 'api::articles:articles',
        options: {
          reviewWorkflows: true,
        },
      },
    });

    const { queryAllByRole, getByRole } = render();

    expect(queryAllByRole('combobox').length).toBe(2);
    expect(getByRole('combobox', { name: 'Review stage' })).toHaveTextContent('Stage 1');

    await waitFor(() =>
      expect(getByRole('combobox', { name: 'Assignee' })).toHaveValue('John Doe')
    );
  });
});
