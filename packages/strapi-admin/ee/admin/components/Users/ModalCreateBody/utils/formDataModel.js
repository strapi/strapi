import baseModel from '../../../../../../admin/src/components/Users/ModalCreateBody/utils/formDataModel';

const ssoInputsModel = ENABLED_EE_FEATURES.includes('sso')
  ? {
      useSSORegistration: true,
    }
  : {};

const formDataModel = {
  ...baseModel,
  ...ssoInputsModel,
};

export default formDataModel;
