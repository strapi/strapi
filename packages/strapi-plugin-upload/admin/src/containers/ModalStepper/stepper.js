import CheckControl from '../../components/CheckControl';
import EditForm from '../../components/EditForm';
import UploadForm from '../../components/UploadForm';
import UploadList from '../../components/UploadList';
import { getTrad } from '../../utils';

const stepper = {
  browse: {
    Component: UploadForm,
    headerBreadcrumbs: [getTrad('modal.header.browse')],
    prev: 'upload',
    next: 'upload',
    withBackButton: true,
  },
  upload: {
    Component: UploadList,
    headerBreadcrumbs: [getTrad('modal.header.pending-assets')],
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
    components: {
      CheckControl,
    },
    headerBreadcrumbs: [getTrad('modal.header.file-detail')],
    next: null,
    prev: null,
    withBackButton: false,
  },
};

export default stepper;
