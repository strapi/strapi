import EditForm from '../../components/EditForm';
import UploadForm from '../../components/UploadForm';
import UploadList from '../../components/UploadList';
import { getTrad } from '../../utils';

const stepper = {
  browse: {
    Component: UploadForm,
    headerBreadcrumbs: [getTrad('modal.header.browse')],
    prev: null,
    next: 'upload',
  },
  upload: {
    Component: UploadList,
    headerBreadcrumbs: [getTrad('modal.header.select-files')],
    next: null,
    prev: 'browse',
  },
  'edit-new': {
    Component: EditForm,
    // TODO: I'll leave it there for the moment
    // because I am not sure about the design since it seems inconsistent
    // headerBreadcrumbs: [
    //   getTrad('modal.header.select-files'),
    //   getTrad('modal.header.file-detail'),
    // ],
    headerBreadcrumbs: [getTrad('modal.header.file-detail')],
    next: 'upload',
    prev: 'upload',
    withBackButton: true,
  },
  edit: {
    Component: EditForm,
    headers: [getTrad('modal.header.file-detail')],
    next: null,
    prev: null,
    withBackButton: false,
  },
};

export default stepper;
