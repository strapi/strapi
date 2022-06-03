'use strict';

const { addImport } = require('./imports');

const generateAttributesDefinition = (attributes, uid) => {
  const attributesDefinitions = [];

  for (const [attributeName, attribute] of Object.entries(attributes)) {
    const type = getAttributeType(attribute, uid);

    attributesDefinitions.push([attributeName, type]);
  }

  return attributesDefinitions
    .map(([name, attributeType]) => `    ${name}: ${attributeType};`)
    .join('\n');
};

const getAttributeType = (attribute, uid) => {
  const mappers = {
    string() {
      return ['StringAttribute', null];
    },
    text() {
      return ['TextAttribute', null];
    },
    richtext() {
      return ['RichTextAttribute', null];
    },
    password() {
      return ['PasswordAttribute', null];
    },
    // email() {
    //   return ['EmailAttribute', null];
    // }
    // date() {
    //   return ['DateAttribute', null];
    // },
    // time() {
    //   return ['TimeAttribute', null];
    // },
    // datetime() {
    //   return ['DateTimeAttribute', null];
    // },
    // timestamp() {
    //   return ['TimestampAttribute', null];
    // },
    integer() {
      return ['IntegerAttribute', null];
    },
    biginteger() {
      return ['BigIntegerAttribute', null];
    },
    float() {
      return ['FloatAttribute', null];
    },
    decimal() {
      return ['DecimalAttribute', null];
    },
    uid() {
      return ['UIDAttribute', null];
    },
    enumeration() {
      return ['EnumerationAttribute', null];
    },
    boolean() {
      return ['BooleanAttribute', null];
    },
    json() {
      return ['JsonAttribute', null];
    },
    media() {
      return ['MediaAttribute', null];
    },
    relation() {
      const { relation, target } = attribute;

      if (relation.includes('morph') | relation.includes('Morph')) {
        return ['PolymorphicRelationAttribute', [`'${uid}'`, `'${relation}'`]];
      }

      return ['RelationAttribute', [`'${uid}'`, `'${relation}'`, `'${target}'`]];
    },
    component() {
      const target = attribute.component;

      return ['ComponentAttribute', [`'${target}'`]];
    },
    dynamiczone() {
      const components = JSON.stringify(attribute.components);

      return ['DynamicZoneAttribute', [components]];
    },
  };

  if (!Object.keys(mappers).includes(attribute.type)) {
    return null;
  }

  let [attributeType, typeParams] = mappers[attribute.type]();

  addImport(attributeType);

  let type = typeParams ? `${attributeType}<${typeParams.join(', ')}>` : attributeType;

  if (attribute.required) {
    addImport('RequiredAttribute');

    type = `${type} & RequiredAttribute`;
  }

  return type;
};

module.exports = {
  generateAttributesDefinition,
  getAttributeType,
};
