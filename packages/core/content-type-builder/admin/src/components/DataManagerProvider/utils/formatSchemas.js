const formatSchemas = schemas => {
  return Object.keys(schemas).reduce((acc, current) => {
    const schema = schemas[current].schema;

    acc[current] = {
      ...schemas[current],
      schema: { ...schema, attributes: toAttributesArray(schema.attributes) },
    };

    return acc;
  }, {});
};

const toAttributesArray = attributes => {
  return Object.keys(attributes).reduce((acc, current) => {
    acc.push({ ...attributes[current], name: current });

    return acc;
  }, []);
};

export default formatSchemas;
export { toAttributesArray };
