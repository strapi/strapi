import { cloneDeep, get, set } from 'lodash';
import { getRequestUrl, mergeMetasWithSchema } from '../../../utils';

const getRelationModel = (targetModel, models) => models.find((model) => model.uid === targetModel);

const formatLayouts = (initialData, models) => {
  const data = createMetasSchema(initialData, models);

  const formattedCTEditLayout = formatLayoutWithMetas(data.contentType, null, models);
  const ctUid = data.contentType.uid;
  const formattedListLayout = formatListLayoutWithMetas(data.contentType, data.components);

  set(data, ['contentType', 'layouts', 'edit'], formattedCTEditLayout);
  set(data, ['contentType', 'layouts', 'list'], formattedListLayout);

  Object.keys(data.components).forEach((compoUID) => {
    const formattedCompoEditLayout = formatLayoutWithMetas(
      data.components[compoUID],
      ctUid,
      models
    );

    set(data, ['components', compoUID, 'layouts', 'edit'], formattedCompoEditLayout);
  });

  return data;
};

const createMetasSchema = (initialData, models) => {
  const data = mergeMetasWithSchema(cloneDeep(initialData), models, 'contentType');
  const { components, contentType } = data;

  const formatMetadatas = (targetSchema) => {
    return Object.keys(targetSchema.metadatas).reduce((acc, current) => {
      const schema = get(targetSchema, ['attributes', current], {});
      let metadatas = targetSchema.metadatas[current];

      if (schema.type === 'relation') {
        const relationModel = getRelationModel(schema.targetModel, models);
        const mainFieldName = metadatas.edit.mainField;
        const mainField = {
          name: mainFieldName,
          schema: get(relationModel, ['attributes', mainFieldName]),
        };

        metadatas = {
          list: {
            ...metadatas.list,
            mainField,
          },
          edit: {
            ...metadatas.edit,
            mainField,
          },
        };
      }

      acc[current] = metadatas;

      return acc;
    }, {});
  };

  set(data, ['contentType', 'metadatas'], formatMetadatas(contentType));

  Object.keys(components).forEach((compoUID) => {
    const currentCompo = components[compoUID];
    const updatedMetas = formatMetadatas(currentCompo);

    set(data, ['components', compoUID, 'metadatas'], updatedMetas);
  });

  return data;
};

const formatLayoutWithMetas = (contentTypeConfiguration, ctUid, models) => {
  const formatted = contentTypeConfiguration.layouts.edit.reduce((acc, current) => {
    const row = current.map((attribute) => {
      const fieldSchema = get(contentTypeConfiguration, ['attributes', attribute.name], {});

      const data = {
        ...attribute,
        fieldSchema,
        metadatas: get(contentTypeConfiguration, ['metadatas', attribute.name, 'edit'], {}),
      };

      if (fieldSchema.type === 'relation') {
        const targetModelUID = fieldSchema.targetModel;
        const targetModelSchema = getRelationModel(targetModelUID, models);
        const targetModelPluginOptions = targetModelSchema.pluginOptions || {};

        const queryInfos = ctUid
          ? generateRelationQueryInfosForComponents(
              contentTypeConfiguration,
              attribute.name,
              ctUid,
              models
            )
          : generateRelationQueryInfos(contentTypeConfiguration, attribute.name, models);

        set(data, 'targetModelPluginOptions', targetModelPluginOptions);
        set(data, 'queryInfos', queryInfos);
      }

      return data;
    });

    acc.push(row);

    return acc;
  }, []);

  return formatted;
};

const formatListLayoutWithMetas = (contentTypeConfiguration, components) => {
  const formatted = contentTypeConfiguration.layouts.list.reduce((acc, current) => {
    const fieldSchema = get(contentTypeConfiguration, ['attributes', current], {});
    const metadatas = get(contentTypeConfiguration, ['metadatas', current, 'list'], {});

    const type = fieldSchema.type;

    if (type === 'relation') {
      const queryInfos = {
        endpoints: {
          search: `collection-types/${contentTypeConfiguration.uid}`,
        },
        defaultParams: {},
      };

      acc.push({ key: `__${current}_key__`, name: current, fieldSchema, metadatas, queryInfos });

      return acc;
    }

    if (type === 'component') {
      const component = components[fieldSchema.component];
      const mainFieldName = component.settings.mainField;
      const mainFieldAttribute = component.attributes[mainFieldName];

      acc.push({
        key: `__${current}_key__`,
        name: current,
        fieldSchema,
        metadatas: {
          ...metadatas,
          mainField: {
            ...mainFieldAttribute,
            name: mainFieldName,
          },
        },
      });

      return acc;
    }

    acc.push({ key: `__${current}_key__`, name: current, fieldSchema, metadatas });

    return acc;
  }, []);

  return formatted;
};

const generateRelationQueryInfos = (contentTypeConfiguration, fieldName, models) => {
  const { uid } = contentTypeConfiguration;
  const targetModel = get(contentTypeConfiguration, ['attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = getDisplayedModels(models).includes(targetModel);

  return {
    endpoints: {
      search: getRequestUrl(`${uid}/${fieldName}`),
    },
    defaultParams: {},
    shouldDisplayRelationLink,
  };
};

const generateRelationQueryInfosForComponents = (
  contentTypeConfiguration,
  fieldName,
  ctUid,
  models
) => {
  const targetModel = get(contentTypeConfiguration, ['attributes', fieldName, 'targetModel'], '');
  const shouldDisplayRelationLink = getDisplayedModels(models).includes(targetModel);

  return {
    endpoints: {
      search: getRequestUrl(`${ctUid}/${fieldName}`),
    },
    defaultParams: {
      _component: contentTypeConfiguration.uid,
    },
    shouldDisplayRelationLink,
  };
};

const getDisplayedModels = (models) =>
  models.filter((model) => model.isDisplayed).map(({ uid }) => uid);

export default formatLayouts;
export {
  formatLayoutWithMetas,
  formatListLayoutWithMetas,
  generateRelationQueryInfos,
  generateRelationQueryInfosForComponents,
  getDisplayedModels,
};
