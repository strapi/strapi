const form = {
  name: {
    styleName: 'col-6',
    label: 'Name',
    type: 'text',
    value: '',
  },
  url: {
    styleName: 'col-12',
    label: 'URL',
    type: 'text',
    value: '',
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
  },
};

export default form;
