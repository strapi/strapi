import { Form } from '@strapi/admin/strapi-admin';
import { render, waitFor, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { WorkflowAttributes, WorkflowAttributesProps } from '../WorkflowAttributes';

const setup = ({
  initialValues = {
    id: 1,
    name: 'Default',
    contentTypes: ['uid1'],
    stages: [],
  },
  ...props
}: WorkflowAttributesProps & {
  initialValues?: Record<string, any>;
} = {}) => ({
  ...render(<WorkflowAttributes {...props} />, {
    renderOptions: {
      wrapper: ({ children }) => {
        return (
          <Form method="PUT" onSubmit={jest.fn()} initialValues={initialValues}>
            {children}
          </Form>
        );
      },
    },
  }),
});

describe('WorkflowAttributes', () => {
  it('should render values', async () => {
    const { getByRole, getByText, user } = setup();

    await screen.findByText(/workflow name/i);

    expect(getByRole('textbox', { name: /workflow name/i })).toHaveValue('Default');
    expect(getByText(/1 content type selected/i)).toBeInTheDocument();
    expect(getByRole('textbox')).toBeEnabled();

    await waitFor(() => {
      expect(getByRole('combobox', { name: /associated to/i })).not.toHaveAttribute(
        'data-disabled'
      );
    });

    await user.click(getByRole('combobox', { name: /associated to/i }));
    await screen.findByRole('option', { name: /Collection CT 1/i });
  });

  it('should disabled fields if canUpdate = false', async () => {
    const { getByRole } = setup({ canUpdate: false });

    await waitFor(() => expect(getByRole('textbox')).toBeDisabled());

    expect(getByRole('combobox', { name: /associated to/i })).toHaveAttribute('data-disabled');
  });

  it('should not render a collection-type group if there are no collection-types', async () => {
    server.use(
      rest.get('/content-manager/content-types', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              {
                uid: 'uid1',
                isDisplayed: true,
                kind: 'singleType',
                info: {
                  displayName: 'Single CT 1',
                },
              },
            ],
          })
        );
      })
    );

    const { getByRole, queryByRole, user } = setup();

    await user.click(getByRole('combobox', { name: /associated to/i }));

    const singleTypeOption = await screen.findByRole('option', { name: /Single Types/i });
    expect(singleTypeOption).toBeInTheDocument();

    expect(queryByRole('option', { name: /Collection Types/i })).not.toBeInTheDocument();
  });

  it('should not render a collection-type group if there are no single-types', async () => {
    server.use(
      rest.get('/content-manager/content-types', (req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              {
                uid: 'uid1',
                isDisplayed: true,
                kind: 'collectionType',
                info: {
                  displayName: 'Collection CT 1',
                },
              },
            ],
          })
        );
      })
    );

    const { getByRole, queryByRole, user } = setup();

    const contentTypesSelect = getByRole('combobox', { name: /associated to/i });

    await user.click(contentTypesSelect);

    await waitFor(() => {
      expect(queryByRole('option', { name: /Single Types/i })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(getByRole('option', { name: /Collection Types/i })).toBeInTheDocument();
    });
  });

  it('should disabled fields if canUpdate = false', async () => {
    const { getByRole } = setup({ canUpdate: false });

    await waitFor(() => {
      expect(getByRole('textbox')).toBeDisabled();
    });
    await waitFor(() => {
      expect(getByRole('combobox', { name: /associated to/i })).toHaveAttribute('data-disabled');
    });
  });
});
