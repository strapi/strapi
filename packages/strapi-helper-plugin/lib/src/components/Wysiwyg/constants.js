export const SELECT_OPTIONS = [
  { id: 'Add a title', value: '' },
  { id: 'Title H1', value: '# innerText.H1' },
  { id: 'Title H2', value: '## innerText.H2' },
  { id: 'Title H3', value: '### innerText.H3' },
  { id: 'Title H4', value: '#### innerText.H4'},
  { id: 'Title H5', value: '##### innerText.H5' },
  { id: 'Title H6', value: '###### innerText.H6' },
];

// NOTE: I leave that as a reminder
export const CONTROLS = [
  [
    {label: 'B', style: 'BOLD', handler: 'toggleInlineStyle' },
    {label: 'I', style: 'ITALIC', className: 'styleButtonItalic', handler: 'toggleInlineStyle' },
    {label: 'U', style: 'UNDERLINE', handler: 'toggleInlineStyle' },
    {label: 'UL', style: 'unordered-list-item', className: 'styleButtonUL', hideLabel: true, handler: 'toggleBlockType' },
    {label: 'OL', style: 'ordered-list-item', className: 'styleButtonOL', hideLabel: true, handler: 'toggleBlockType' },
  ],
  [
    {label: '<>', style: 'code-block', handler: 'toggleBlockType' },
    {label: 'quotes', style: 'blockquote', className: 'styleButtonBlockQuote', hideLabel: true, handler: 'toggleBlockType' },
  ],
];

export const NEW_CONTROLS = [
  [
    {label: 'B', style: 'BOLD', handler: 'addEntity', text: '__innerText__' },
    {label: 'I', style: 'ITALIC', className: 'styleButtonItalic', handler: 'addEntity', text: '*innerText*' },
    {label: 'U', style: 'UNDERLINE', handler: 'addEntity', text: '<u>innerText</u>' },
    {label: 'UL', style: 'unordered-list-item', className: 'styleButtonUL', hideLabel: true, handler: 'addEntity', text: '- innerText' },
    {label: 'OL', style: 'ordered-list-item', className: 'styleButtonOL', hideLabel: true, handler: 'addEntity', text: '1. innerText' },
  ],
  [
    {label: '<>', style: 'code-block', handler: 'addEntity', text: '```innerText```' },
    {label: 'img', style: 'IMG', className: 'styleButtonImg', hideLabel: true, handler: 'addEntity', text: '![innerText](link)' },
    {label: 'Link', style: 'LINK', className: 'styleButtonLink',hideLabel: true, handler: 'addEntity', text: '[innerText](link)' },
    {label: 'quotes', style: 'blockquote', className: 'styleButtonBlockQuote', hideLabel: true, handler: 'addEntity', text: '> innerText' },
  ],
];
