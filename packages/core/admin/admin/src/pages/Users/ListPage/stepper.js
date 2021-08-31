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
};

export default stepper;
