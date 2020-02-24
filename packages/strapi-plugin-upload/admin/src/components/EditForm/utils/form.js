import getTrad from '../../../utils/getTrad';

const form = [
  {
    key: 1,
    inputs: [
      {
        label: { id: getTrad('form.input.label.file-name') },
        name: 'name',
        value: '',
      },
    ],
  },

  {
    key: 2,
    inputs: [
      {
        description: { id: getTrad('form.input.decription.file-alt') },
        label: { id: getTrad('form.input.label.file-alt') },
        name: 'alt',
        value: '',
      },
    ],
  },
  {
    key: 3,
    inputs: [
      {
        label: { id: getTrad('form.input.label.file-caption') },
        name: 'caption',
        value: '',
      },
    ],
  },
];

export default form;
