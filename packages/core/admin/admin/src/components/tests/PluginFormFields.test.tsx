import { Grid } from '@strapi/design-system';
import { render, screen } from '@tests/utils';
import { Formik, useFormikContext } from 'formik';

import { FormFields, type FormFieldsProps } from '../../core/apis/FormFields';
import { Form, useForm } from '../Form';
import { FormikPluginFormFields, PluginFormFields } from '../PluginFormFields';

const RolesPerSpace = ({ value, error, onChange, replacedFields, entityId }: FormFieldsProps) => (
  <button
    type="button"
    onClick={() => {
      onChange({ roles: [{ space: 'france', roleIds: [2] }] });
      replacedFields.roles?.onChange([2]);
    }}
  >
    {`entity ${entityId} roles ${JSON.stringify(replacedFields.roles?.value)} value ${JSON.stringify(
      value ?? null
    )} error ${JSON.stringify(error ?? null)}`}
  </button>
);

const Values = () => {
  const values = useForm('Values', (state) => state.values);

  return <pre>{JSON.stringify(values)}</pre>;
};

const FormikValues = () => {
  const { values } = useFormikContext();

  return <pre>{JSON.stringify(values)}</pre>;
};

const renderWithFields = (ui: React.ReactElement) => {
  const formFields = new FormFields();
  formFields.unstable_register('user', [
    { pluginId: 'spaces', Component: RolesPerSpace, replaces: ['roles'] },
  ]);
  formFields.unstable_register('role', [{ pluginId: 'spaces', Component: RolesPerSpace }]);

  return render(ui, { providerOptions: { formFields } });
};

describe('PluginFormFields', () => {
  it('keeps the plugin values under plugins and lets a plugin set the field it replaces', async () => {
    const { user } = renderWithFields(
      <Form
        method="PUT"
        initialValues={{ roles: [1], plugins: {} }}
        initialErrors={{ plugins: { spaces: 'Pick a space' } }}
        onSubmit={jest.fn()}
      >
        <Grid.Root>
          <PluginFormFields form="user" entityId={7} />
        </Grid.Root>
        <Values />
      </Form>
    );

    await user.click(
      screen.getByRole('button', { name: 'entity 7 roles [1] value null error "Pick a space"' })
    );

    expect(
      screen.getByText(
        JSON.stringify({
          roles: [2],
          plugins: { spaces: { roles: [{ space: 'france', roleIds: [2] }] } },
        })
      )
    ).toBeInTheDocument();
  });

  it('keeps the plugin values under plugins in a Formik form', async () => {
    const { user } = renderWithFields(
      <Formik initialValues={{ name: 'Editor' }} onSubmit={jest.fn()}>
        <Grid.Root>
          <FormikPluginFormFields form="role" />
          <FormikValues />
        </Grid.Root>
      </Formik>
    );

    await user.click(screen.getByRole('button', { name: /^entity undefined roles undefined/ }));

    expect(
      screen.getByText(
        JSON.stringify({
          name: 'Editor',
          plugins: { spaces: { roles: [{ space: 'france', roleIds: [2] }] } },
        })
      )
    ).toBeInTheDocument();
  });

  it('renders nothing without plugin fields', () => {
    render(
      <Form method="POST" initialValues={{}} onSubmit={jest.fn()}>
        <PluginFormFields form="api-token" />
      </Form>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
