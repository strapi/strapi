import baseForm from '../../../../../../admin/src/components/Users/ModalCreateBody/utils/roleSettingsForm';

const ssoInputs = ENABLED_EE_FEATURES.includes('sso')
  ? {
      useSSORegistration: {
        label: 'Settings.permissions.users.form.sso',
        type: 'bool',
        validations: {
          required: true,
        },
        description: 'Settings.permissions.users.form.sso.description',
      },
    }
  : {};

const form = {
  ...baseForm,
  ...ssoInputs,
};

export default form;
