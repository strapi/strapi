export const SELECT_OPTIONS = [
  { id: 'Add a title', value: '' },
  { id: 'Title H1', value: '#' },
  { id: 'Title H2', value: '##' },
  { id: 'Title H3', value: '###' },
  { id: 'Title H4', value: '####'},
  { id: 'Title H5', value: '#####' },
  { id: 'Title H6', value: '######' },
];

export const NEW_CONTROLS = [
  [
    { label: 'B', style: 'BOLD', className: 'styleButtonBold', hideLabel: true, handler: 'addEntity', text: '**innerText**' },
    { label: 'I', style: 'ITALIC', className: 'styleButtonItalic', hideLabel: true, handler: 'addEntity', text: '*innerText*' },
    { label: 'U', style: 'UNDERLINE', className: 'styleButtonUnderline', hideLabel: true, handler: 'addEntity', text: '__innerText__' },
    { label: 'UL', style: 'unordered-list-item', className: 'styleButtonUL', hideLabel: true, handler: 'addUlBlock', text: '- innerText' },
    { label: 'OL', style: 'ordered-list-item', className: 'styleButtonOL', hideLabel: true, handler: 'addOlBlock', text: '1. innerText' },
  ],
  [
    { label: '<>', style: 'code-block', className: 'styleButtonCodeBlock', hideLabel: true, handler: 'addSimpleBlock', text: '```innerText```' },
    { label: 'img', style: 'IMG', className: 'styleButtonImg', hideLabel: true, handler: 'addLinkMediaBlockWithSelection', text: '![innerText](link)' },
    { label: 'Link', style: 'LINK', className: 'styleButtonLink',hideLabel: true, handler: 'addLink', text: '[text](link)' },
    { label: 'quotes', style: 'blockquote', className: 'styleButtonBlockQuote', hideLabel: true, handler: 'addSimpleBlock', text: '> innerText' },
  ],
];


export const END_REPLACER = '_*</u>`](link)';
export const START_REPLACER = '_*<u>-`>#[ ![ 1. ';
