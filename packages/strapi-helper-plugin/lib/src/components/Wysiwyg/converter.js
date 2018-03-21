import showdown from 'showdown';

const converterOptions = {
  parseImgDimensions: true,
  simplifiedAutoLink: true,
  strikethrough: true,
  tables: true,
  tasklists: true,
  smoothLivePreview: true,
  simpleLineBreaks: true,
  backslashEscapesHTMLTags: true,
  emoji: true,
  underline: true,
};

const converter = new showdown.Converter(converterOptions);

export default converter;
