import Providers from '../components/Providers';
import baseForms from '../../../../../admin/src/containers/AuthPage/utils/forms';

const forms = {
  ...baseForms,
  providers: {
    Component: Providers,
    endPoint: null,
    fieldsToDisable: [],
    fieldsToOmit: [],
    schema: null,
    inputsPrefix: '',
  },
};

export default forms;
