const modalStepper = {
  browse: {
    prev: null,
    next: 'upload',
    footer: [],
  },
  upload: {
    prev: 'browse',
    next: null,
    footer: [],
  },
  'edit-new': {
    prev: 'upload',
    next: null,
    footer: [],
  },
};

export default modalStepper;
