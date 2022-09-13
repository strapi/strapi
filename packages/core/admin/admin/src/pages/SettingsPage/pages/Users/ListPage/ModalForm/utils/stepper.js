const stepper = {
  create: {
    buttonSubmitLabel: {
      id: 'app.containers.Users.ModalForm.footer.button-success',
      defaultMessage: 'Invite user',
    },
    isDisabled: false,
    next: 'magic-link',
  },
  'magic-link': {
    buttonSubmitLabel: { id: 'global.finish', defaultMessage: 'Finish' },
    isDisabled: true,
    next: null,
  },
};

export default stepper;
