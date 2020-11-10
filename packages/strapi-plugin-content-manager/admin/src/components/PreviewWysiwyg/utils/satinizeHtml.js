import sanitizeHtml from 'sanitize-html';

// Options for the lib can be found here https://www.npmjs.com/package/sanitize-html
const options = {
  ...sanitizeHtml.defaults,
  allowedTags: false,
  allowedAttributes: {
    '*': ['href', 'align', 'alt', 'center', 'width', 'height', 'type', 'controls', 'target'],
    img: ['src', 'alt'],
    source: ['src', 'type'],
  },
};

const clean = dirty => sanitizeHtml(dirty, options);

export default clean;
