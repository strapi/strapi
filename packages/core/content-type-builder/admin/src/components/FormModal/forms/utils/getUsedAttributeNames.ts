export type SchemaData = {
  initialData: {
    name: string;
    targetAttribute: any;
  };
  modifiedData: object;
};

export type Attribute = {
  name: string;
};

export const getUsedAttributeNames = (
  attributes: Array<Attribute>,
  schemaData: SchemaData
): Array<string> => {
  return attributes
    .filter(({ name }) => {
      return name !== schemaData.initialData.name;
    })
    .map(({ name }) => name);
};
