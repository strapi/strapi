const validateSchema = schema => {
  const dynamicZoneAttributes = Object.values(schema.attributes).filter(
    ({ type }) => type === 'dynamiczone'
  );

  if (dynamicZoneAttributes.length === 0) {
    return true;
  }

  return dynamicZoneAttributes.every(
    ({ components }) => Array.isArray(components) && components.length > 0
  );
};

export default validateSchema;
