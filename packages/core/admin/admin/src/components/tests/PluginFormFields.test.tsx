import * as React from 'react';

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

/** A plugin field that sets a default value in an effect, as a plugin with a default can */
const setOnMount =
  (value: string) =>
  ({ onChange }: FormFieldsProps) => {
    React.useEffect(() => {
      onChange(value);
    }, [onChange]);

    return null;
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
        <PluginFormFields form="content-api-token" />
      </Form>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    [
      'the admin Form',
      <Form key="form" method="POST" initialValues={{}} onSubmit={jest.fn()}>
        <PluginFormFields form="user" />
        <Values />
      </Form>,
    ],
    [
      'a Formik form',
      <Formik key="formik" initialValues={{}} onSubmit={jest.fn()}>
        <Grid.Root>
          <FormikPluginFormFields form="user" />
          <FormikValues />
        </Grid.Root>
      </Formik>,
    ],
  ])(
    'keeps the values of two plugins that change them in the same render, in %s',
    async (_, ui) => {
      const formFields = new FormFields();
      formFields.unstable_register('user', [
        { pluginId: 'spaces', Component: setOnMount('france') },
        { pluginId: 'teams', Component: setOnMount('blue') },
      ]);

      render(ui, { providerOptions: { formFields } });

      expect(
        await screen.findByText(JSON.stringify({ plugins: { spaces: 'france', teams: 'blue' } }))
      ).toBeInTheDocument();
    }
  );

  it.each([
    [
      'the admin Form',
      (field: React.ReactElement) => (
        <Form method="POST" initialValues={{}} onSubmit={jest.fn()}>
          {field}
        </Form>
      ),
      <PluginFormFields key="form" form="user" />,
    ],
    [
      'a Formik form',
      (field: React.ReactElement) => (
        <Formik initialValues={{}} onSubmit={jest.fn()}>
          <Grid.Root>{field}</Grid.Root>
        </Formik>
      ),
      <FormikPluginFormFields key="formik" form="user" />,
    ],
  ])(
    'keeps onChange and the roles onChange the same across renders, in %s',
    async (_, wrap, field) => {
      const seen = { onChange: new Set<unknown>(), roles: new Set<unknown>() };
      const Field = ({ onChange, replacedFields }: FormFieldsProps) => {
        seen.onChange.add(onChange);
        seen.roles.add(replacedFields.roles?.onChange);

        return (
          <button type="button" onClick={() => onChange(Math.random())}>
            Change
          </button>
        );
      };

      const formFields = new FormFields();
      formFields.unstable_register('user', [
        { pluginId: 'spaces', Component: Field, replaces: ['roles'] },
      ]);

      const { user } = render(wrap(field), { providerOptions: { formFields } });

      await user.click(screen.getByRole('button', { name: 'Change' }));
      await user.click(screen.getByRole('button', { name: 'Change' }));

      expect(seen.onChange.size).toBe(1);
      expect(seen.roles.size).toBe(1);
    }
  );

  it('gives the roles field only to the plugin that replaces it', () => {
    const Roles = ({ replacedFields }: FormFieldsProps) => (
      <p>{`roles field ${replacedFields.roles ? 'given' : 'not given'}`}</p>
    );

    const formFields = new FormFields();
    formFields.unstable_register('user', [
      { pluginId: 'spaces', Component: Roles, replaces: ['roles'] },
      { pluginId: 'teams', Component: Roles },
    ]);

    render(
      <Form method="PUT" initialValues={{ roles: [1] }} onSubmit={jest.fn()}>
        <PluginFormFields form="user" />
      </Form>,
      { providerOptions: { formFields } }
    );

    expect(screen.getAllByText(/^roles field/).map((element) => element.textContent)).toEqual([
      'roles field given',
      'roles field not given',
    ]);
  });

  it('remounts the plugin fields when the form sets plugins back to undefined after a save', async () => {
    const mounted = jest.fn();
    const Field = ({ value, onChange }: FormFieldsProps) => {
      React.useEffect(() => {
        mounted();
      }, []);

      return (
        <button type="button" onClick={() => onChange('changed')}>
          {`value ${JSON.stringify(value ?? null)}`}
        </button>
      );
    };

    const ResetAfterSave = () => {
      const onChange = useForm('ResetAfterSave', (state) => state.onChange);

      return (
        <button type="button" onClick={() => onChange('plugins', undefined)}>
          Saved
        </button>
      );
    };

    const formFields = new FormFields();
    formFields.unstable_register('role', [{ pluginId: 'spaces', Component: Field }]);

    const { user } = render(
      <Form method="PUT" initialValues={{}} onSubmit={jest.fn()}>
        <PluginFormFields form="role" />
        <ResetAfterSave />
      </Form>,
      { providerOptions: { formFields } }
    );

    await user.click(screen.getByRole('button', { name: 'value null' }));
    expect(mounted).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Saved' }));

    expect(await screen.findByRole('button', { name: 'value null' })).toBeInTheDocument();
    expect(mounted).toHaveBeenCalledTimes(2);
  });

  it('passes the first message of a roles error that is not a string', () => {
    const RolesError = ({ replacedFields }: FormFieldsProps) => (
      <p>{`roles error ${replacedFields.roles?.error ?? 'none'}`}</p>
    );

    const formFields = new FormFields();
    formFields.unstable_register('user', [
      { pluginId: 'spaces', Component: RolesError, replaces: ['roles'] },
    ]);

    render(
      <Form
        method="PUT"
        initialValues={{ roles: [] }}
        initialErrors={{ roles: ['Pick a role'] } as never}
        onSubmit={jest.fn()}
      >
        <PluginFormFields form="user" />
      </Form>,
      { providerOptions: { formFields } }
    );

    expect(screen.getByText('roles error Pick a role')).toBeInTheDocument();
  });
});
