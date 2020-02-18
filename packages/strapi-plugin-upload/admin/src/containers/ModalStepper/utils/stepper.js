import UploadForm from '../../../components/UploadForm';
import UploadList from '../../../components/UploadList';
import getTrad from '../../../utils/getTrad';

const stepper = {
  browse: {
    Component: UploadForm,
    generateFooter: () => [],
    headerTradId: getTrad('modal.header.browse'),
    prev: null,
    next: 'upload',
  },
  upload: {
    Component: UploadList,
    headerTradId: getTrad('modal.header.select-files'),
    generateFooter: () => [],
    next: null,
    prev: 'browse',
  },
  'edit-new': {
    Component: null,
    headerTradId: 'coming soon',
    generateFooter: () => [],
    next: null,
    prev: 'upload',
  },
};

export default stepper;
