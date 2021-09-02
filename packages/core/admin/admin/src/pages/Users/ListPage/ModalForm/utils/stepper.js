// import { ModalCreateBody } fro../../../../../components/Usersers';

const stepper = {
  create: {
    buttonSubmitLabel: {
      id: 'app.containers.Users.ModalForm.footer.button-success',
      defaultMessage: 'Create user',
    },
    // Component: ModalCreateBody,
    isDisabled: false,
    next: 'magic-link',
  },
  'magic-link': {
    buttonSubmitLabel: { id: 'form.button.finish', defaultMessage: 'Finish' },
    // Component: ModalCreateBody,
    isDisabled: true,
    next: null,
  },
};

export default stepper;
