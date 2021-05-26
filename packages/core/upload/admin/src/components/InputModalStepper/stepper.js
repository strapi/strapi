import CheckControl from '../CheckControl';
import EditForm from '../EditForm';
import getTrad from '../../utils/getTrad';
import ListModal from '../ListModal';
import Search from './Search';
import UploadForm from '../UploadForm';
import UploadList from '../UploadList';

const stepper = {
  list: {
    Component: ListModal,
    HeaderComponent: Search,
    prev: null,
    next: null,
  },
  browse: {
    Component: UploadForm,
    headerBreadcrumbs: [getTrad('modal.header.browse')],
    prev: 'list',
    next: 'upload',
    withBackButton: true,
    backButtonDestination: 'upload',
  },
  upload: {
    Component: UploadList,
    headerBreadcrumbs: [getTrad('modal.header.select-files')],
    next: null,
    prev: 'browse',
    withBackButton: true,
    // Exception in order to not update the entire code
    backButtonDestination: 'list',
  },
  'edit-new': {
    Component: EditForm,
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
    headerBreadcrumbs: [getTrad('modal.header.select-files'), getTrad('modal.header.file-detail')],
    next: null,
    prev: 'list',
    withBackButton: true,
  },
};

export default stepper;
