export const validateSchema = (schema: any) => {
  const dynamicZoneAttributes = Object.values(schema.attributes).filter(
    (attribute: any) => attribute.type === 'dynamiczone'
  );

  return dynamicZoneAttributes.every(
    (attribute: any) => Array.isArray(attribute.components) && attribute.components.length > 0
  );
};
