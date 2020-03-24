import EditForm from '../../components/EditForm';
import getTrad from '../../utils/getTrad';
import ListModal from '../../components/ListModal';
import Search from './Search';
import UploadForm from '../../components/UploadForm';
import UploadList from '../../components/UploadList';

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
  },
  upload: {
    Component: UploadList,
    headerBreadcrumbs: [getTrad('modal.header.select-files')],
    next: null,
    prev: 'browse',
  },
  'edit-new': {
    Component: EditForm,
    headerBreadcrumbs: [getTrad('modal.header.file-detail')],
    next: 'upload',
    prev: 'upload',
    withBackButton: true,
  },
};

export default stepper;
