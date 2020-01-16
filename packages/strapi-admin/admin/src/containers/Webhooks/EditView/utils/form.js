const form = {
  name: {
    styleName: 'col-6',
    label: 'Settings.webhooks.form.name',
    type: 'text',
    value: '',
  },
  url: {
    styleName: 'col-12',
    label: 'Settings.webhooks.form.url',
    type: 'text',
    value: '',
  },
  headers: {
    styleName: 'col-12',
    label: 'Settings.webhooks.form.headers',
    type: 'headers',
    value: [{ key: '', value: '' }],
  },
  events: {
    styleName: 'col-12',
    label: 'Settings.webhooks.form.events',
    type: 'events',
    value: [],
  },
};

export default form;
