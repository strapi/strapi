import UploadForm from '../../../components/UploadForm';
import UploadList from '../../../components/UploadList';
import getTrad from '../../../utils/getTrad';

const stepper = {
  browse: {
    Component: UploadForm,
    headers: [getTrad('modal.header.browse')],
    prev: null,
    next: 'upload',
  },
  upload: {
    Component: UploadList,
    headers: [getTrad('modal.header.select-files')],
    next: null,
    prev: 'browse',
  },
  'edit-new': {
    Component: () => null,
    headers: [
      getTrad('modal.header.select-files'),
      getTrad('modal.header.file-detail'),
    ],
    next: null,
    prev: 'upload',
  },
};

export default stepper;
