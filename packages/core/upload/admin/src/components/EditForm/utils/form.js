import { getTrad } from '../../../utils';

const form = [
  {
    key: 1,
    inputs: [
      {
        label: { id: getTrad('form.input.label.file-name') },
        name: 'fileInfo.name',
      },
    ],
  },
  {
    key: 2,
    inputs: [
      {
        description: { id: getTrad('form.input.decription.file-alt') },
        label: { id: getTrad('form.input.label.file-alt') },
        name: 'fileInfo.alternativeText',
      },
    ],
  },
  {
    key: 3,
    inputs: [
      {
        label: { id: getTrad('form.input.label.file-caption') },
        name: 'fileInfo.caption',
      },
    ],
  },
];

export default form;
