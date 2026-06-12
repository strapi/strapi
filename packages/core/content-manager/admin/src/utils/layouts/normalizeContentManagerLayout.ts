import type {
  Component,
  ComponentConfiguration,
  FindComponentConfiguration,
} from '../../../../shared/contracts/components';
import type {
  Configuration,
  FindContentTypeConfiguration,
  FindContentTypesSettings,
  Layouts,
  Metadatas,
  Settings,
  UpdateContentTypeConfiguration,
} from '../../../../shared/contracts/content-types';
import type { ComponentsDictionary, Schema } from '../../hooks/useDocument';
import type { Schema as SchemaUtils } from '@strapi/types';

type ContentTypeConfigurationData = FindContentTypeConfiguration.Response['data'];
type ComponentConfigurationData = FindComponentConfiguration.Response['data'];
type ComponentConfigurationResponseData = ComponentConfigurationData['component'];

type NormalizationContext = {
  components: ComponentsDictionary;
  schema?: Schema | Component;
  schemas: Schema[];
};

type ComponentNormalizationContext = {
  components: ComponentsDictionary;
  schema?: Component;
  schemas: Schema[];
};

type Attributes = Schema['attributes'] | Component['attributes'];

const DEFAULT_RESPONSE_SETTINGS: Settings = {
  bulkable: false,
  filterable: false,
  searchable: false,
  pageSize: 10,
  mainField: 'id',
  defaultSortBy: '',
  defaultSortOrder: 'ASC',
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const normalizeResponseSettings = (settings: unknown): Settings => {
  return {
    ...DEFAULT_RESPONSE_SETTINGS,
    ...(isRecord(settings) ? settings : {}),
  } as Settings;
};

const normalizeResponseMetadatas = (metadatas: unknown): Metadatas => {
  if (!isRecord(metadatas)) {
    return {};
  }

  return Object.entries(metadatas).reduce<Metadatas>((acc, [name, metadata]) => {
    const metadataRecord = isRecord(metadata) ? metadata : {};

    acc[name] = {
      edit: isRecord(metadataRecord.edit) ? metadataRecord.edit : {},
      list: isRecord(metadataRecord.list) ? metadataRecord.list : {},
    } as Metadatas[string];

    return acc;
  }, {});
};

const normalizeResponseLayouts = (layouts: unknown): Layouts => {
  if (!isRecord(layouts)) {
    return {
      edit: [],
      list: [],
    };
  }

  return {
    edit: Array.isArray(layouts.edit)
      ? layouts.edit
          .filter(Array.isArray)
          .map((row) =>
            row.filter(
              (field): field is { name: string; size: number } =>
                isRecord(field) && typeof field.name === 'string' && typeof field.size === 'number'
            )
          )
      : [],
    list: Array.isArray(layouts.list)
      ? layouts.list.filter((field): field is string => typeof field === 'string')
      : [],
  };
};

const normalizeConfigurationResponse = <TConfiguration extends Configuration>(
  configuration: unknown,
  uid?: string
): TConfiguration => {
  const configurationRecord = isRecord(configuration) ? configuration : {};

  return {
    ...configurationRecord,
    ...(uid ? { uid } : {}),
    settings: normalizeResponseSettings(configurationRecord.settings),
    metadatas: normalizeResponseMetadatas(configurationRecord.metadatas),
    layouts: normalizeResponseLayouts(configurationRecord.layouts),
  } as TConfiguration;
};

const normalizeComponentsRecord = (components: unknown): Record<string, ComponentConfiguration> => {
  if (!isRecord(components)) {
    return {};
  }

  return Object.entries(components).reduce<Record<string, ComponentConfiguration>>(
    (acc, [uid, configuration]) => {
      acc[uid] = normalizeConfigurationResponse<ComponentConfiguration>(configuration, uid);

      return acc;
    },
    {}
  );
};

const normalizeContentTypeConfigurationResponse = (
  data: unknown,
  uid?: string
): FindContentTypeConfiguration.Response['data'] => {
  const dataRecord = isRecord(data) ? data : {};

  return {
    contentType: normalizeConfigurationResponse(dataRecord.contentType, uid),
    components: normalizeComponentsRecord(dataRecord.components),
  };
};

const normalizeContentTypeConfigurationUpdateResponse = (
  data: unknown
): UpdateContentTypeConfiguration.Response['data'] => {
  const dataRecord = isRecord(data) ? data : {};

  return {
    contentType: normalizeConfigurationResponse(dataRecord.contentType),
    components: normalizeComponentsRecord(dataRecord.components),
  };
};

const normalizeComponentConfigurationResponse = (
  data: unknown,
  uid?: string
): FindComponentConfiguration.Response['data'] => {
  const dataRecord = isRecord(data) ? data : {};

  return {
    component: normalizeConfigurationResponse<ComponentConfigurationResponseData>(
      dataRecord.component,
      uid
    ),
    components: normalizeComponentsRecord(dataRecord.components),
  };
};

const normalizeComponentConfigurationUpdateResponse = (
  data: unknown
): ComponentConfigurationResponseData => {
  return normalizeConfigurationResponse<ComponentConfigurationResponseData>(data);
};

const normalizeContentTypeSettingsResponse = (
  data: unknown
): FindContentTypesSettings.Response['data'] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter(isRecord)
    .filter(
      (entry): entry is Record<string, unknown> & { uid: string } => typeof entry.uid === 'string'
    )
    .map((entry) => ({
      uid: entry.uid,
      settings: normalizeResponseSettings(entry.settings),
    }));
};

const hasAttribute = (attributes: Attributes | undefined, name: string | undefined) => {
  return Boolean(name && attributes?.[name]);
};

const getTargetAttributes = (
  attribute: SchemaUtils.Attribute.AnyAttribute,
  { components, schemas }: Pick<NormalizationContext, 'components' | 'schemas'>
) => {
  if (attribute.type === 'component') {
    return components[attribute.component]?.attributes;
  }

  if (attribute.type === 'relation') {
    const target =
      'targetModel' in attribute
        ? attribute.targetModel
        : 'target' in attribute
          ? attribute.target
          : undefined;

    return schemas.find((schema) => schema.uid === target)?.attributes;
  }

  return undefined;
};

const normalizeMainField = (
  attribute: SchemaUtils.Attribute.AnyAttribute,
  mainField: string | undefined,
  context: Pick<NormalizationContext, 'components' | 'schemas'>
) => {
  if (!mainField) {
    return mainField;
  }

  const targetAttributes = getTargetAttributes(attribute, context);

  if (!targetAttributes) {
    return attribute.type === 'component' || attribute.type === 'relation' ? 'id' : mainField;
  }

  return hasAttribute(targetAttributes, mainField) ? mainField : 'id';
};

const normalizeSettings = (settings: Settings, attributes: Attributes | undefined) => {
  if (
    !settings.mainField ||
    hasAttribute(attributes, settings.mainField) ||
    settings.mainField === 'id'
  ) {
    return settings;
  }

  return {
    ...settings,
    mainField: 'id',
  };
};

const hasResolvableComponent = (
  attribute: SchemaUtils.Attribute.AnyAttribute | undefined,
  context: Pick<NormalizationContext, 'components'>
) => {
  if (!attribute || !('component' in attribute) || typeof attribute.component !== 'string') {
    return true;
  }

  return Boolean(context.components[attribute.component]);
};

const normalizeMetadatas = (
  metadatas: Metadatas,
  attributes: Attributes | undefined,
  context: Pick<NormalizationContext, 'components' | 'schemas'>
) => {
  return Object.entries(metadatas).reduce<Metadatas>((acc, [name, metadata]) => {
    const attribute = attributes?.[name];

    if (!attribute || !hasResolvableComponent(attribute, context)) {
      return acc;
    }

    acc[name] = {
      edit: {
        ...metadata.edit,
        // `mainField` is present at runtime for component/relation edit metadata.
        ...('mainField' in metadata.edit
          ? {
              mainField: normalizeMainField(
                attribute,
                (metadata.edit as { mainField?: string }).mainField,
                context
              ),
            }
          : {}),
      },
      list: {
        ...metadata.list,
        mainField: normalizeMainField(attribute, metadata.list.mainField, context),
      },
    };

    return acc;
  }, {});
};

const normalizeLayouts = (
  layouts: Layouts,
  attributes: Attributes | undefined,
  metadatas: Metadatas,
  context: Pick<NormalizationContext, 'components'>
) => {
  const hasRenderableField = (name: string) => {
    const attribute = attributes?.[name];

    return Boolean(attribute && metadatas[name] && hasResolvableComponent(attribute, context));
  };

  return {
    edit: (layouts.edit ?? [])
      .map((row) => row.filter((field) => hasRenderableField(field.name)))
      .filter((row) => row.length > 0),
    list: (layouts.list ?? []).filter((name) => hasRenderableField(name)),
  };
};

const normalizeConfiguration = <TConfiguration extends Configuration>(
  configuration: TConfiguration,
  attributes: Attributes | undefined,
  context: Pick<NormalizationContext, 'components' | 'schemas'>
) => {
  const metadatas = normalizeMetadatas(configuration.metadatas, attributes, context);
  const layouts = normalizeLayouts(configuration.layouts, attributes, metadatas, context);

  return {
    ...configuration,
    settings: normalizeSettings(configuration.settings, attributes),
    metadatas,
    layouts,
  };
};

const normalizeComponents = (
  componentConfigurations: Record<string, ComponentConfiguration>,
  context: Pick<NormalizationContext, 'components' | 'schemas'>
) => {
  return Object.entries(componentConfigurations).reduce<Record<string, ComponentConfiguration>>(
    (acc, [uid, configuration]) => {
      const componentSchema = context.components[uid];

      if (!componentSchema) {
        return acc;
      }

      acc[uid] = normalizeConfiguration(configuration, componentSchema.attributes, context);

      return acc;
    },
    {}
  );
};

const normalizeContentManagerLayout = (
  data: ContentTypeConfigurationData,
  context: NormalizationContext
): ContentTypeConfigurationData => {
  const normalizedComponents = normalizeComponents(data.components, context);

  return {
    contentType: normalizeConfiguration(data.contentType, context.schema?.attributes, context),
    components: normalizedComponents,
  };
};

const normalizeComponentConfigurationLayout = (
  data: ComponentConfigurationData,
  context: ComponentNormalizationContext
): ComponentConfigurationData => {
  const normalizedComponents = normalizeComponents(data.components, {
    components: context.components,
    schemas: context.schemas,
  });

  return {
    component: normalizeConfiguration(data.component, context.schema?.attributes, {
      components: context.components,
      schemas: context.schemas,
    }),
    components: normalizedComponents,
  };
};

export {
  normalizeContentManagerLayout,
  normalizeComponentConfigurationLayout,
  normalizeContentTypeConfigurationResponse,
  normalizeContentTypeConfigurationUpdateResponse,
  normalizeComponentConfigurationResponse,
  normalizeComponentConfigurationUpdateResponse,
  normalizeContentTypeSettingsResponse,
};
