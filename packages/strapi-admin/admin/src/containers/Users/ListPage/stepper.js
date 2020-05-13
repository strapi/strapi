import ModalCreateBody from '../../../components/Users/ModalCreateBody';

const stepper = {
  create: {
    buttonSubmitLabel: 'app.containers.Users.ModalForm.footer.button-success',
    Component: ModalCreateBody,
    isDisabled: false,
    // next: 'magic-link',

    // TODO: set is back to magic-link
    next: null,
  },
  'magic-link': {
    buttonSubmitLabel: 'form.button.continue',
    Component: ModalCreateBody,
    isDisabled: true,
    next: 'summary',
  },
  summary: {
    buttonSubmitLabel: 'form.button.done',
    Component: () => 'COMING SOON',
    isDisabled: false,
    next: null,
  },
};

export default stepper;
