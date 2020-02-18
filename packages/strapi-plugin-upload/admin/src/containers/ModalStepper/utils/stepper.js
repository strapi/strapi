import UploadForm from '../../../components/UploadForm';
import getTrad from '../../../utils/getTrad';

const stepper = {
  browse: {
    prev: null,
    next: 'upload',
    Component: UploadForm,
    headerTradId: getTrad('modal.header.browse'),
    generateFooter: () => [],
  },
  upload: {
    prev: 'browse',
    next: null,
    Component: null,
    generateFooter: () => [],
  },
  'edit-new': {
    prev: 'upload',
    next: null,
    Component: null,
    generateFooter: () => [],
  },
};

export default stepper;
