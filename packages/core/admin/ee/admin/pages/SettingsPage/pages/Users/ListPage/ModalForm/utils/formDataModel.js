import baseModel from '../../../../../../../../../admin/src/pages/SettingsPage/pages/Users/ListPage/ModalForm/utils/formDataModel';

const ssoInputsModel = window.strapi.features.isEnabled(window.strapi.features.SSO)
  ? {
      useSSORegistration: true,
    }
  : {};

const formDataModel = {
  ...baseModel,
  ...ssoInputsModel,
};

export default formDataModel;
