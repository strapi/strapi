import AddLogoDialog from './AddLogoDialog';
import PendingLogoDialog from './PendingLogoDialog';

const stepper = {
  add: {
    Component: AddLogoDialog,
    modalTitle: 'Upload logo',
    next: 'pending',
    prev: null,
  },
  pending: {
    Component: PendingLogoDialog,
    modalTitle: 'Pending logo',
    next: null,
    prev: 'add',
  },
};

export default stepper;
