import baseForms from '../../../../../admin/src/pages/AuthPage/utils/forms';
import Providers from '../components/Providers';

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
