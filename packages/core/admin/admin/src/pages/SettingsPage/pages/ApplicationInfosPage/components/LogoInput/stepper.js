import AddLogoDialog from '../LogoModalStepper/AddLogoDialog';
import PendingLogoDialog from '../LogoModalStepper/PendingLogoDialog';

const stepper = {
  upload: {
    Component: AddLogoDialog,
    modalTitle: {
      id: 'Settings.application.customization.modal.upload',
      defaultMessage: 'Upload logo',
    },
    next: 'pending',
    prev: null,
  },
  pending: {
    Component: PendingLogoDialog,
    modalTitle: {
      id: 'Settings.application.customization.modal.pending',
      defaultMessage: 'Pending logo',
    },
    next: null,
    prev: 'upload',
  },
};

export default stepper;
