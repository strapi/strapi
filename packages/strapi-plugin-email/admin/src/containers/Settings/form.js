import getTrad from '../../utils/getTrad';

const form = [
  {
    label: getTrad('Settings.form.label.provider'),
    name: 'provider',
    type: 'select',
    size: { xs: 6 },
    options: [],
  },
  {
    label: getTrad('Settings.form.label.defaultFrom'),
    name: 'settings.defaultFrom',
    type: 'text',
    size: { xs: 6 },
    placeholder: getTrad('Settings.form.placeholder.defaultFrom'),
  },
  {
    label: getTrad('Settings.form.label.defaultReplyTo'),
    name: 'settings.defaultReplyTo',
    type: 'text',
    size: { xs: 6 },
    placeholder: getTrad('Settings.form.placeholder.defaultReplyTo'),
  },
];

export default form;
