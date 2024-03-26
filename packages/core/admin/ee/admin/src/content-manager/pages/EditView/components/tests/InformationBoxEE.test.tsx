import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render, waitFor } from '@tests/utils';

import { STAGE_ATTRIBUTE_NAME, ASSIGNEE_ATTRIBUTE_NAME } from '../constants';
import { InformationBoxEE } from '../InformationBoxEE';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
}));

describe('EE | Content Manager | EditView | InformationBox', () => {
  it('renders the title and body of the Information component', async () => {
    jest.mocked(useCMEditViewDataManager).mockReturnValue({
      initialData: {},
      isCreatingEntry: true,
      // @ts-expect-error – we only need partial data for this test
      layout: {
        options: {
          reviewWorkflows: false,
        },
      },
      allLayoutData: {
        components: {},
        contentType: undefined,
      },
      createActionAllowedFields: [],
      formErrors: {},
      hasDraftAndPublish: false,
      isSingleType: false,
      modifiedData: {},
      readActionAllowedFields: [],
      upateActionAllowedFields: [],
    });

    const { findByText } = render(<InformationBoxEE />);

    await findByText('Information');
    await findByText('Last update');
  });

  it('renders neither stage nor assignee select inputs, if no nothing is returned for an entity', async () => {
    jest.mocked(useCMEditViewDataManager).mockReturnValue({
      initialData: {},
      // @ts-expect-error – we only need partial data for this test
      layout: {
        options: {
          reviewWorkflows: false,
        },
      },
      allLayoutData: {
        components: {},
        contentType: undefined,
      },
      createActionAllowedFields: [],
      formErrors: {},
      hasDraftAndPublish: false,
      isCreatingEntry: false,
      isSingleType: false,
      modifiedData: {},
      readActionAllowedFields: [],
      upateActionAllowedFields: [],
    });

    const { queryByRole } = render(<InformationBoxEE />);

    await waitFor(() => expect(queryByRole('combobox')).not.toBeInTheDocument());
  });

  it('renders stage and assignee select inputs, if both are set on an entity', async () => {
    jest.mocked(useCMEditViewDataManager).mockReturnValue({
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
        // @ts-expect-error – we only need partial data for this test
        uid: 'api::articles:articles',
        options: {
          reviewWorkflows: true,
        },
      },
      allLayoutData: {
        components: {},
        contentType: undefined,
      },
      createActionAllowedFields: [],
      formErrors: {},
      hasDraftAndPublish: false,
      isCreatingEntry: false,
      isSingleType: false,
      modifiedData: {},
      readActionAllowedFields: [],
      upateActionAllowedFields: [],
    });

    const { queryAllByRole, getByRole } = render(<InformationBoxEE />);

    expect(queryAllByRole('combobox').length).toBe(2);
    expect(getByRole('combobox', { name: 'Review stage' })).toHaveTextContent('Stage 1');

    await waitFor(() =>
      expect(getByRole('combobox', { name: 'Assignee' })).toHaveValue('John Doe')
    );
  });
});
