import baseModel from '../../../../../../../admin/src/pages/Users/ListPage/ModalForm/utils/formDataModel';

const ssoInputsModel = strapi.features.isEnabled(strapi.features.SSO)
  ? {
      useSSORegistration: true,
    }
  : {};

const formDataModel = {
  ...baseModel,
  ...ssoInputsModel,
};

export default formDataModel;
