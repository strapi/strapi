const form = {
  name: {
    styleName: 'col-6',
    label: 'Name',
    type: 'text',
    value: '',
    validations: {
      required: true,
      regex: new RegExp('(^$)|(^[A-Za-z][_0-9A-Za-z ]*$)'),
    },
  },
  url: {
    styleName: 'col-12',
    label: 'URL',
    type: 'text',
    value: '',
    validations: {
      required: true,
      regex: new RegExp('(^$)|((https?://.*)(d*)/?(.*))'),
    },
  },
  headers: {
    styleName: 'col-12',
    label: 'Headers',
    type: 'headers',
    value: [{ key: '', value: '' }],
  },
  events: {
    styleName: 'col-12',
    label: 'Hooks',
    type: 'events',
    value: [],
    validations: {
      required: true,
    },
  },
};

export default form;
