import set from 'lodash/set';
import merge from 'lodash/merge';

const mergeMetasWithSchema = (data, schemas, mainSchemaKey) => {
  const findSchema = (refUid) => schemas.find((obj) => obj.uid === refUid);
  const merged = Object.assign({}, data);
  const mainUID = data[mainSchemaKey].uid;
  const mainSchema = findSchema(mainUID);

  set(merged, [mainSchemaKey], merge({}, mainSchema, data[mainSchemaKey]));

  Object.keys(data.components).forEach((compoUID) => {
    const compoSchema = findSchema(compoUID);

    set(merged, ['components', compoUID], { ...data.components[compoUID], ...compoSchema });
  });

  return merged;
};

export default mergeMetasWithSchema;
