import merge from 'lodash/merge';
import set from 'lodash/set';

const mergeMetasWithSchema = (data, schemas, mainSchemaKey) => {
  const findSchema = (refUid) => schemas.find((obj) => obj.uid === refUid);
  const merged = Object.assign({}, data);
  const mainUID = data[mainSchemaKey].uid;
  const mainSchema = findSchema(mainUID);

  // TODO
  // In order to merge all the layers of the schema objects, we used the Lodash function "merge".
  // If the destructuration is used, it will only merge the first layer of properties and overwrite the nested objects.
  set(merged, [mainSchemaKey], merge({}, mainSchema, data[mainSchemaKey]));

  Object.keys(data.components).forEach((compoUID) => {
    const compoSchema = findSchema(compoUID);

    set(merged, ['components', compoUID], { ...data.components[compoUID], ...compoSchema });
  });

  return merged;
};

export default mergeMetasWithSchema;
