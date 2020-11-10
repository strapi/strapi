import { cloneDeep, get, set } from 'lodash';
import { mergeMetasWithSchema } from '../../../utils';
import pluginId from '../../../pluginId';

const formatLayoutWithMetas = (obj, ctUid, models) => {
  const formatted = obj.layouts.edit.reduce((acc, current) => {
    const row = current.map(attribute => {
      const fieldSchema = get(obj, ['attributes', attribute.name], {});

      const data = {
        ...attribute,
        fieldSchema,
        metadatas: get(obj, ['metadatas', attribute.name, 'edit'], {}),
      };

      if (fieldSchema.type === 'relation') {
        const queryInfos = ctUid
          ? generateRelationQueryInfosForComponents(obj, attribute.name, ctUid, models)
          : generateRelationQueryInfos(obj, attribute.name, models);

        set(data, 'queryInfos', queryInfos);
      }

      return data;
    });

    acc.push(row);

    return acc;
  }, []);

  return formatted;
};

const getDisplayedModels = models =>
  models.filter(model => model.isDisplayed).map(({ uid }) => uid);

const generateRelationQueryInfos = (obj, fieldName, models) => {
  const uid = obj.uid;
  const endPoint = `/${pluginId}/relations/${uid}/${fieldName}`;
  const mainField = get(obj, ['metadatas', fieldName, 'edit', 'mainField'], '');
  const targetModel = get(obj, ['attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = getDisplayedModels(models).indexOf(targetModel) !== -1;

  const queryInfos = {
    endPoint,
    containsKey: `${mainField}_contains`,
    defaultParams: {},
    shouldDisplayRelationLink,
  };

  return queryInfos;
};

const generateRelationQueryInfosForComponents = (obj, fieldName, ctUid, models) => {
  const endPoint = `/${pluginId}/relations/${ctUid}/${fieldName}`;
  const mainField = get(obj, ['metadatas', fieldName, 'edit', 'mainField'], '');
  const targetModel = get(obj, ['attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = getDisplayedModels(models).indexOf(targetModel) !== -1;

  const queryInfos = {
    endPoint,
    containsKey: `${mainField}_contains`,
    defaultParams: {
      _component: obj.uid,
    },
    shouldDisplayRelationLink,
  };

  return queryInfos;
};

// editRelations is an array of strings...
const formatEditRelationsLayoutWithMetas = (obj, models) => {
  const formatted = obj.layouts.editRelations.reduce((acc, current) => {
    const fieldSchema = get(obj, ['attributes', current], {});
    const metadatas = get(obj, ['metadatas', current, 'edit'], {});
    const size = 6;

    const queryInfos = generateRelationQueryInfos(obj, current, models);

    acc.push({
      name: current,
      size,
      fieldSchema,
      metadatas,
      queryInfos,
    });

    return acc;
  }, []);

  return formatted;
};

const formatListLayoutWithMetas = obj => {
  const formatted = obj.layouts.list.reduce((acc, current) => {
    const fieldSchema = get(obj, ['attributes', current], {});
    const metadatas = get(obj, ['metadatas', current, 'list'], {});

    acc.push({ key: `__${current}_key__`, name: current, fieldSchema, metadatas });

    return acc;
  }, []);

  return formatted;
};

// const mergeMetasWithSchema = (data, schemas) => {
//   const findSchema = refUid => schemas.find(obj => obj.uid === refUid);
//   const merged = Object.assign({}, data);
//   const contentTypeUid = data.contentType ? data.contentType.uid : data.component.uid;
//   const contentTypeSchema = findSchema(contentTypeUid);

//   set(merged, ['contentType'], { ...data.contentType, ...contentTypeSchema });

//   Object.keys(data.components).forEach(compoUID => {
//     const compoSchema = findSchema(compoUID);

//     set(merged, ['components', compoUID], { ...data.components[compoUID], ...compoSchema });
//   });

//   return merged;
// };

const formatLayouts = (initialData, models) => {
  const data = mergeMetasWithSchema(cloneDeep(initialData), models, 'contentType');
  const formattedCTEditLayout = formatLayoutWithMetas(data.contentType, models);
  const ctUid = data.contentType.uid;
  const formattedEditRelationsLayout = formatEditRelationsLayoutWithMetas(data.contentType, models);
  const formattedListLayout = formatListLayoutWithMetas(data.contentType);

  set(data, ['contentType', 'layouts', 'edit'], formattedCTEditLayout);
  set(data, ['contentType', 'layouts', 'editRelations'], formattedEditRelationsLayout);
  set(data, ['contentType', 'layouts', 'list'], formattedListLayout);

  Object.keys(data.components).forEach(compoUID => {
    const formattedCompoEditLayout = formatLayoutWithMetas(
      data.components[compoUID],
      ctUid,
      models
    );

    set(data, ['components', compoUID, 'layouts', 'edit'], formattedCompoEditLayout);
  });

  return data;
};

export default formatLayouts;
export { formatEditRelationsLayoutWithMetas, formatLayoutWithMetas };
