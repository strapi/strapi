const escapeNewlines = (content = '', placeholder = '\n') => {
  return content.replace(/[\r\n]+/g, placeholder);
};

const deepTrimObject = attribute => {
  if (Array.isArray(attribute)) {
    return attribute.map(deepTrimObject);
  }

  if (typeof attribute === 'object') {
    return Object.entries(attribute).reduce((acc, [key, value]) => {
      const trimmedObject = deepTrimObject(value);

      return { ...acc, [key]: trimmedObject };
    }, {});
  }

  return typeof attribute === 'string' ? attribute.trim() : attribute;
};

module.exports = {
  escapeNewlines,
  deepTrimObject,
};
