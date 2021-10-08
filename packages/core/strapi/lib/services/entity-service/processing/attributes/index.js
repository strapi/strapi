'use strict';

const { AttributeProcessor } = require('./processor');
const { PasswordProcessor } = require('./password');

const createProcessorsManager = () => {
  const associations = new Map();

  return {
    assoc(type, processor) {
      associations.set(type, processor);

      return this;
    },

    get(type) {
      return associations.get(type) || new AttributeProcessor();
    },

    process(value, context, options = {}) {
      const { validate = true, transform = true } = options;
      const { attribute } = context;

      let newValue = value;

      // Retrieve the processor based on the given type
      const processor = this.get(attribute.type);

      if (validate) {
        processor.validate(value, context);
      }

      if (transform) {
        newValue = processor.transform(value, context);
      }

      return newValue;
    },
  };
};

module.exports = {
  createProcessorsManager,

  processors: {
    AttributeProcessor,
    PasswordProcessor,
  },
};
