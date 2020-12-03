import { cloneDeep, get, set } from 'lodash';
import { mergeMetasWithSchema } from '../../../utils';
import pluginId from '../../../pluginId';

// editRelations is an array of strings...
const formatEditRelationsLayoutWithMetas = (contentTypeConfiguration, models) => {
  const formatted = contentTypeConfiguration.layouts.editRelations.reduce((acc, current) => {
    const fieldSchema = get(contentTypeConfiguration, ['attributes', current], {});
    const metadatas = get(contentTypeConfiguration, ['metadatas', current, 'edit'], {});
    const size = 6;

    const queryInfos = generateRelationQueryInfos(contentTypeConfiguration, current, models);

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

const formatLayouts = (initialData, models) => {
  const data = mergeMetasWithSchema(cloneDeep(initialData), models, 'contentType');
  const formattedCTEditLayout = formatLayoutWithMetas(data.contentType, null, models);
  const ctUid = data.contentType.uid;
  const formattedEditRelationsLayout = formatEditRelationsLayoutWithMetas(data.contentType, models);
  const formattedListLayout = formatListLayoutWithMetas(data.contentType, models);
  const formattedMetadatasLayout = formatMetadatasRelations(data.contentType, models);

  set(data, ['contentType', 'layouts', 'edit'], formattedCTEditLayout);
  set(data, ['contentType', 'layouts', 'editRelations'], formattedEditRelationsLayout);
  set(data, ['contentType', 'layouts', 'list'], formattedListLayout);
  set(data, ['contentType', 'metadatas'], formattedMetadatasLayout);

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

const formatMetadatasRelations = (contentTypeConfiguration, models) => {
  const formattedRelationsMetadatas = contentTypeConfiguration.layouts.editRelations.reduce(
    (acc, current) => {
      const currentMetadatas = get(contentTypeConfiguration, ['metadatas', current], {});

      return {
        ...acc,
        [current]: {
          ...currentMetadatas,
          list: {
            ...currentMetadatas.list,
            mainField: getMainField(current, contentTypeConfiguration, models),
          },
        },
      };
    },
    {}
  );

  return { ...contentTypeConfiguration.metadatas, ...formattedRelationsMetadatas };
};

const formatLayoutWithMetas = (contentTypeConfiguration, ctUid, models) => {
  const formatted = contentTypeConfiguration.layouts.edit.reduce((acc, current) => {
    const row = current.map(attribute => {
      const fieldSchema = get(contentTypeConfiguration, ['attributes', attribute.name], {});

      const data = {
        ...attribute,
        fieldSchema,
        metadatas: get(contentTypeConfiguration, ['metadatas', attribute.name, 'edit'], {}),
      };

      if (fieldSchema.type === 'relation') {
        const queryInfos = ctUid
          ? generateRelationQueryInfosForComponents(
              contentTypeConfiguration,
              attribute.name,
              ctUid,
              models
            )
          : generateRelationQueryInfos(contentTypeConfiguration, attribute.name, models);

        set(data, 'queryInfos', queryInfos);
      }

      return data;
    });

    acc.push(row);

    return acc;
  }, []);

  return formatted;
};

const formatListLayoutWithMetas = contentTypeConfiguration => {
  const formatted = contentTypeConfiguration.layouts.list.reduce((acc, current) => {
    const fieldSchema = get(contentTypeConfiguration, ['attributes', current], {});
    let metadatas = get(contentTypeConfiguration, ['metadatas', current, 'list'], {});

    const type = fieldSchema.type;

    if (type === 'relation') {
      metadatas = {
        ...metadatas,
        mainField: get(contentTypeConfiguration, ['metadatas', current, 'edit', 'mainField'], 'id'),
      };
    }

    acc.push({ key: `__${current}_key__`, name: current, fieldSchema, metadatas });

    return acc;
  }, []);

  return formatted;
};

const generateRelationQueryInfos = (contentTypeConfiguration, fieldName, models) => {
  const uid = contentTypeConfiguration.uid;
  const endPoint = `/${pluginId}/relations/${uid}/${fieldName}`;
  const mainField = get(
    contentTypeConfiguration,
    ['metadatas', fieldName, 'edit', 'mainField'],
    ''
  );
  const targetModel = get(contentTypeConfiguration, ['attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = getDisplayedModels(models).indexOf(targetModel) !== -1;

  const queryInfos = {
    endPoint,
    containsKey: `${mainField}_contains`,
    defaultParams: {},
    shouldDisplayRelationLink,
  };

  return queryInfos;
};

const generateRelationQueryInfosForComponents = (
  contentTypeConfiguration,
  fieldName,
  ctUid,
  models
) => {
  const endPoint = `/${pluginId}/relations/${ctUid}/${fieldName}`;
  const mainField = get(
    contentTypeConfiguration,
    ['metadatas', fieldName, 'edit', 'mainField'],
    ''
  );
  const targetModel = get(contentTypeConfiguration, ['attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = getDisplayedModels(models).indexOf(targetModel) !== -1;

  const queryInfos = {
    endPoint,
    containsKey: `${mainField}_contains`,
    defaultParams: {
      _component: contentTypeConfiguration.uid,
    },
    shouldDisplayRelationLink,
  };

  return queryInfos;
};

const getDisplayedModels = models =>
  models.filter(model => model.isDisplayed).map(({ uid }) => uid);

const getMainField = (relationField, contentTypeConfiguration, models) => {
  const mainField = get(
    contentTypeConfiguration,
    ['metadatas', relationField, 'edit', 'mainField'],
    'id'
  );
  const targetModelUid = get(
    contentTypeConfiguration,
    ['attributes', relationField, 'targetModel'],
    ''
  );
  const relationModel = models.find(model => model.uid === targetModelUid);
  const mainFieldSchema = get(relationModel, ['attributes', mainField], {});

  return {
    name: mainField,
    schema: mainFieldSchema,
    queryInfos: {
      endPoint: `collection-types/${contentTypeConfiguration.uid}`,
      defaultParams: {},
    },
  };
};

export default formatLayouts;
export {
  formatEditRelationsLayoutWithMetas,
  formatLayoutWithMetas,
  formatListLayoutWithMetas,
  formatMetadatasRelations,
  generateRelationQueryInfos,
  generateRelationQueryInfosForComponents,
  getMainField,
  getDisplayedModels,
};
