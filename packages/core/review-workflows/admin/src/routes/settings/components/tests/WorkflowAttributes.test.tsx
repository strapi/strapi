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

  /**
   * This test is skipped atm because theres no way to tell when the async process have finished.
   */
  it.skip('should disabled fields if canUpdate = false', async () => {
    const { getByRole, findByText } = setup({ canUpdate: false });

    await waitFor(() => expect(getByRole('textbox')).toBeDisabled());

    expect(getByRole('combobox', { name: /associated to/i })).toHaveAttribute('data-disabled');

    await findByText('1 content type selected');
  });

  /**
   * this test is very flakey in the CI, we should look into re-enabling it later.
   */
  it.skip('should not render a collection-type group if there are no collection-types', async () => {
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

    const { getByRole, user, queryByRole } = setup();

    expect(getByRole('combobox', { name: /associated to/i })).toBeEnabled();
    await user.click(getByRole('combobox', { name: 'Associated to' }));

    expect(queryByRole('option', { name: /Collection Types/i })).not.toBeInTheDocument();
    expect(getByRole('option', { name: /Single Types/i })).toBeInTheDocument();
  });

  /**
   * this test is very flakey in the CI, we should look into re-enabling it later.
   */
  it.skip('should not render a collection-type group if there are no single-types', async () => {
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

    await screen.findByText(/workflow name/i);

    expect(getByRole('combobox', { name: /associated to/i })).toBeEnabled();
    await user.click(getByRole('combobox', { name: /associated to/i }));

    expect(queryByRole('option', { name: /Single Types/i })).not.toBeInTheDocument();
    expect(getByRole('option', { name: /Collection Types/i })).toBeInTheDocument();
  });
});
