export type SchemaData = {
  initialData: {
    name?: string;
    targetAttribute?: string | null;
    [key: string]: unknown;
  };
  modifiedData: {
    createComponent?: boolean;
    enum?: string[];
    name?: string;
    relation?: string;
    repeatable?: boolean;
    targetAttribute?: string | null;
    targetField?: string;
    type?: string;
    [key: string]: unknown;
  };
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
