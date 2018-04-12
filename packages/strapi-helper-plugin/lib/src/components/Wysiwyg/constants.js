export const SELECT_OPTIONS = [
  { id: 'components.Wysiwyg.selectOptions.title', value: '' },
  { id: 'components.Wysiwyg.selectOptions.H1', value: '#' },
  { id: 'components.Wysiwyg.selectOptions.H2', value: '##' },
  { id: 'components.Wysiwyg.selectOptions.H3', value: '###' },
  { id: 'components.Wysiwyg.selectOptions.H4', value: '####' },
  { id: 'components.Wysiwyg.selectOptions.H5', value: '#####' },
  { id: 'components.Wysiwyg.selectOptions.H6', value: '######' },
];

export const CONTROLS = [
  [
    {
      label: 'B',
      style: 'BOLD',
      className: 'styleButtonBold',
      hideLabel: true,
      handler: 'addContent',
      text: '**textToReplace**',
    },
    {
      label: 'I',
      style: 'ITALIC',
      className: 'styleButtonItalic',
      hideLabel: true,
      handler: 'addContent',
      text: '*textToReplace*',
    },
    {
      label: 'U',
      style: 'UNDERLINE',
      className: 'styleButtonUnderline',
      hideLabel: true,
      handler: 'addContent',
      text: '__textToReplace__',
    },
    {
      label: 'S',
      style: 'STRIKED',
      className: 'styleButtonStrikedOut',
      hideLabel: true,
      handler: 'addContent',
      text: '~~textToReplace~~',
    },
    {
      label: 'UL',
      style: 'unordered-list-item',
      className: 'styleButtonUL',
      hideLabel: true,
      handler: 'addUlBlock',
      text: '- textToReplace',
    },
    {
      label: 'OL',
      style: 'ordered-list-item',
      className: 'styleButtonOL',
      hideLabel: true,
      handler: 'addOlBlock',
      text: '1. textToReplace',
    },
  ],
  [
    {
      label: '<>',
      style: 'CODE',
      className: 'styleButtonCodeBlock',
      hideLabel: true,
      handler: 'addSimpleBlockWithSelection',
      text: '```textToReplace```',
    },
    {
      label: 'img',
      style: 'IMG',
      className: 'styleButtonImg',
      hideLabel: true,
      handler: 'addSimpleBlockWithSelection',
      text: '![text](textToReplace)',
    },
    {
      label: 'Link',
      style: 'LINK',
      className: 'styleButtonLink',
      hideLabel: true,
      handler: 'addContent',
      text: '[text](textToReplace)',
    },
    {
      label: 'quotes',
      style: 'BLOCKQUOTE',
      className: 'styleButtonBlockQuote',
      hideLabel: true,
      handler: 'addSimpleBlockWithSelection',
      text: '> textToReplace',
    },
  ],
];

export const DEFAULT_INDENTATION = '  ';
