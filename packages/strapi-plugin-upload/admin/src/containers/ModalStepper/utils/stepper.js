import EditForm from '../../../components/EditForm';
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
    Component: EditForm,
    // TODO: I'll leave it there for the moment
    // because I am not sure about the design since it seems inconsistent
    // headers: [
    //   getTrad('modal.header.select-files'),
    //   getTrad('modal.header.file-detail'),
    // ],
    headers: [
      // getTrad('modal.header.select-files'),
      getTrad('modal.header.file-detail'),
    ],
    next: null,
    prev: 'upload',
    withBackButton: true,
  },
};

export default stepper;
