import { ModalCreateBody } from '../../../components/Users';

const stepper = {
  create: {
    buttonSubmitLabel: 'app.containers.Users.ModalForm.footer.button-success',
    Component: ModalCreateBody,
    isDisabled: false,
    next: 'magic-link',
  },
  'magic-link': {
    buttonSubmitLabel: 'form.button.continue',
    Component: ModalCreateBody,
    isDisabled: true,
    next: null,
  },
  // TODO: I am not sure this step is needed we might need to delete it
  summary: {
    buttonSubmitLabel: 'form.button.done',
    Component: () => 'COMING SOON',
    isDisabled: false,
    next: null,
  },
};

export default stepper;
