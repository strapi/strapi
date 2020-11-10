import { set } from 'lodash';

const mergeMetasWithSchema = (data, schemas, mainSchemaKey) => {
  const findSchema = refUid => schemas.find(obj => obj.uid === refUid);
  const merged = Object.assign({}, data);
  const mainUID = data[mainSchemaKey].uid;
  // const contentTypeUid = data.contentType ? data.contentType.uid : data.component.uid;
  const mainSchema = findSchema(mainUID);
  // const contentTypeSchema = findSchema(contentTypeUid);

  // set(merged, ['contentType'], { ...data.contentType, ...contentTypeSchema });
  set(merged, [mainSchemaKey], { ...data[mainSchemaKey], ...mainSchema });

  Object.keys(data.components).forEach(compoUID => {
    const compoSchema = findSchema(compoUID);

    set(merged, ['components', compoUID], { ...data.components[compoUID], ...compoSchema });
  });

  return merged;
};

export default mergeMetasWithSchema;
