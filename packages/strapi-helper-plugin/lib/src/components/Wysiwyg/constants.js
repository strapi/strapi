export const SELECT_OPTIONS = [
  { id: 'components.Wysiwyg.selectOptions.title', value: '' },
  { id: 'components.Wysiwyg.selectOptions.H1', value: '#' },
  { id: 'components.Wysiwyg.selectOptions.H2', value: '##' },
  { id: 'components.Wysiwyg.selectOptions.H3', value: '###' },
  { id: 'components.Wysiwyg.selectOptions.H4', value: '####'},
  { id: 'components.Wysiwyg.selectOptions.H5', value: '#####' },
  { id: 'components.Wysiwyg.selectOptions.H6', value: '######' },
];

export const CONTROLS = [
  [
    { label: 'B', style: 'BOLD', className: 'styleButtonBold', hideLabel: true, handler: 'addContent', text: '**innerText**' },
    { label: 'I', style: 'ITALIC', className: 'styleButtonItalic', hideLabel: true, handler: 'addContent', text: '*innerText*' },
    { label: 'U', style: 'UNDERLINE', className: 'styleButtonUnderline', hideLabel: true, handler: 'addContent', text: '__innerText__' },
    { label: 'S', style: 'STRIKED', className: 'styleButtonStrikedOut', hideLabel: true, handler: 'addContent', text: '~~innerText~~' },
    { label: 'UL', style: 'unordered-list-item', className: 'styleButtonUL', hideLabel: true, handler: 'addUlBlock', text: '- innerText' },
    { label: 'OL', style: 'ordered-list-item', className: 'styleButtonOL', hideLabel: true, handler: 'addOlBlock', text: '1. innerText' },
  ],
  [
    { label: '<>', style: 'code-block', className: 'styleButtonCodeBlock', hideLabel: true, handler: 'addSimpleBlockWithSelection', text: '```innerText```' },
    { label: 'img', style: 'IMG', className: 'styleButtonImg', hideLabel: true, handler: 'addSimpleBlockWithSelection', text: '![text](innerText)' },
    { label: 'Link', style: 'LINK', className: 'styleButtonLink', hideLabel: true, handler: 'addContent', text: '[text](innerText)' },
    { label: 'quotes', style: 'blockquote', className: 'styleButtonBlockQuote', hideLabel: true, handler: 'addSimpleBlockWithSelection', text: '> innerText' },
  ],
];


export const END_REPLACER = '_*</u>`](link)';
export const START_REPLACER = '_*<u>-`>#[ ![ 1. ';
