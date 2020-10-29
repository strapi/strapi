import { get, set } from 'lodash';
import pluginId from '../../../pluginId';

const formatLayoutWithMetas = (obj, ctUid, models) => {
  const formatted = obj.layouts.edit.reduce((acc, current) => {
    const row = current.map(attribute => {
      const fieldSchema = get(obj, ['schema', 'attributes', attribute.name], {});

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

const generateRelationQueryInfos = (obj, fieldName, models) => {
  const uid = obj.uid;
  const endPoint = `/${pluginId}/explorer/${uid}/relation-list/${fieldName}`;
  const mainField = get(obj, ['metadatas', fieldName, 'edit', 'mainField'], '');
  const targetModel = get(obj, ['schema', 'attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = models.indexOf(targetModel) !== -1;

  const queryInfos = {
    endPoint,
    containsKey: `${mainField}_contains`,
    defaultParams: {},
    shouldDisplayRelationLink,
  };

  return queryInfos;
};

const generateRelationQueryInfosForComponents = (obj, fieldName, ctUid, models) => {
  const endPoint = `/${pluginId}/explorer/${ctUid}/relation-list/${fieldName}`;
  const mainField = get(obj, ['metadatas', fieldName, 'edit', 'mainField'], '');
  const targetModel = get(obj, ['schema', 'attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = models.indexOf(targetModel) !== -1;

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
    const fieldSchema = get(obj, ['schema', 'attributes', current], {});
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

const formatLayouts = (data, models) => {
  const formattedCTEditLayout = formatLayoutWithMetas(data.contentType, models);
  const ctUid = data.contentType.uid;
  const formattedEditRelationsLayout = formatEditRelationsLayoutWithMetas(data.contentType, models);

  set(data, ['contentType', 'layouts', 'edit'], formattedCTEditLayout);
  set(data, ['contentType', 'layouts', 'editRelations'], formattedEditRelationsLayout);

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
