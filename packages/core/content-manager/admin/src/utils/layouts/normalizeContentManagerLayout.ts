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
  bulkable: true,
  filterable: true,
  searchable: true,
  pageSize: 10,
  mainField: 'id',
  defaultSortBy: '',
  defaultSortOrder: 'ASC',
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const warnOnceInDevelopment = (() => {
  const warnings = new Set<string>();

  return (message: string) => {
    if (process.env.NODE_ENV !== 'development' || warnings.has(message)) {
      return;
    }

    warnings.add(message);
    console.warn(`[Content Manager] ${message}`);
  };
})();

const normalizeResponseSettings = (settings: unknown, path: string): Settings => {
  if (!isRecord(settings)) {
    warnOnceInDevelopment(`Received malformed settings at "${path}". Falling back to defaults.`);
  }

  return {
    ...DEFAULT_RESPONSE_SETTINGS,
    ...(isRecord(settings) ? settings : {}),
  } as Settings;
};

const normalizeResponseMetadatas = (metadatas: unknown, path: string): Metadatas => {
  if (!isRecord(metadatas)) {
    warnOnceInDevelopment(`Received malformed metadatas at "${path}". Falling back to empty.`);
    return {};
  }

  return Object.entries(metadatas).reduce<Metadatas>((acc, [name, metadata]) => {
    const metadataRecord = isRecord(metadata) ? metadata : {};

    if (!isRecord(metadata)) {
      warnOnceInDevelopment(`Received malformed metadata for "${path}.${name}". Repairing entry.`);
    }

    if (!isRecord(metadataRecord.edit)) {
      warnOnceInDevelopment(
        `Received malformed edit metadata for "${path}.${name}". Falling back to empty.`
      );
    }

    if (!isRecord(metadataRecord.list)) {
      warnOnceInDevelopment(
        `Received malformed list metadata for "${path}.${name}". Falling back to empty.`
      );
    }

    acc[name] = {
      edit: isRecord(metadataRecord.edit) ? metadataRecord.edit : {},
      list: isRecord(metadataRecord.list) ? metadataRecord.list : {},
    } as Metadatas[string];

    return acc;
  }, {});
};

const normalizeResponseLayouts = (layouts: unknown, path: string): Layouts => {
  if (!isRecord(layouts)) {
    warnOnceInDevelopment(`Received malformed layouts at "${path}". Falling back to empty.`);
    return {
      edit: [],
      list: [],
    };
  }

  if (!Array.isArray(layouts.edit)) {
    warnOnceInDevelopment(`Received malformed edit layout at "${path}". Falling back to empty.`);
  }

  if (!Array.isArray(layouts.list)) {
    warnOnceInDevelopment(`Received malformed list layout at "${path}". Falling back to empty.`);
  }

  return {
    edit: Array.isArray(layouts.edit)
      ? layouts.edit.map((row, rowIndex) => {
          if (!Array.isArray(row)) {
            warnOnceInDevelopment(`Dropped malformed edit layout row "${path}.edit.${rowIndex}".`);
            return [];
          }

          return row.filter((field, fieldIndex): field is { name: string; size: number } => {
            const isValidField =
              isRecord(field) && typeof field.name === 'string' && typeof field.size === 'number';

            if (!isValidField) {
              warnOnceInDevelopment(
                `Dropped malformed edit layout field "${path}.edit.${rowIndex}.${fieldIndex}".`
              );
            }

            return isValidField;
          });
        })
      : [],
    list: Array.isArray(layouts.list)
      ? layouts.list.filter((field, index): field is string => {
          const isValidField = typeof field === 'string';

          if (!isValidField) {
            warnOnceInDevelopment(`Dropped malformed list layout field "${path}.list.${index}".`);
          }

          return isValidField;
        })
      : [],
  };
};

const normalizeConfigurationResponse = <TConfiguration extends Configuration>(
  configuration: unknown,
  uid?: string,
  path = uid ?? 'configuration'
): TConfiguration => {
  if (!isRecord(configuration)) {
    warnOnceInDevelopment(`Received malformed configuration at "${path}". Repairing entry.`);
  }

  const configurationRecord = isRecord(configuration) ? configuration : {};

  return {
    ...configurationRecord,
    ...(uid ? { uid } : {}),
    settings: normalizeResponseSettings(configurationRecord.settings, `${path}.settings`),
    metadatas: normalizeResponseMetadatas(configurationRecord.metadatas, `${path}.metadatas`),
    layouts: normalizeResponseLayouts(configurationRecord.layouts, `${path}.layouts`),
  } as TConfiguration;
};

const normalizeComponentsRecord = (components: unknown): Record<string, ComponentConfiguration> => {
  if (!isRecord(components)) {
    warnOnceInDevelopment(
      'Received malformed component configuration record. Falling back to empty.'
    );
    return {};
  }

  return Object.entries(components).reduce<Record<string, ComponentConfiguration>>(
    (acc, [uid, configuration]) => {
      acc[uid] = normalizeConfigurationResponse<ComponentConfiguration>(
        configuration,
        uid,
        `components.${uid}`
      );

      return acc;
    },
    {}
  );
};

const normalizeContentTypeConfigurationResponse = (
  data: unknown,
  uid?: string
): FindContentTypeConfiguration.Response['data'] => {
  if (!isRecord(data)) {
    warnOnceInDevelopment(
      'Received malformed content-type configuration response. Repairing data.'
    );
  }

  const dataRecord = isRecord(data) ? data : {};

  return {
    contentType: normalizeConfigurationResponse(dataRecord.contentType, uid, 'contentType'),
    components: normalizeComponentsRecord(dataRecord.components),
  };
};

const normalizeContentTypeConfigurationUpdateResponse = (
  data: unknown
): UpdateContentTypeConfiguration.Response['data'] => {
  if (!isRecord(data)) {
    warnOnceInDevelopment(
      'Received malformed content-type configuration update response. Repairing data.'
    );
  }

  const dataRecord = isRecord(data) ? data : {};

  return {
    contentType: normalizeConfigurationResponse(dataRecord.contentType, undefined, 'contentType'),
    components: normalizeComponentsRecord(dataRecord.components),
  };
};

const normalizeComponentConfigurationResponse = (
  data: unknown,
  uid?: string
): FindComponentConfiguration.Response['data'] => {
  if (!isRecord(data)) {
    warnOnceInDevelopment('Received malformed component configuration response. Repairing data.');
  }

  const dataRecord = isRecord(data) ? data : {};

  return {
    component: normalizeConfigurationResponse<ComponentConfigurationResponseData>(
      dataRecord.component,
      uid,
      'component'
    ),
    components: normalizeComponentsRecord(dataRecord.components),
  };
};

const normalizeComponentConfigurationUpdateResponse = (
  data: unknown
): ComponentConfigurationResponseData => {
  return normalizeConfigurationResponse<ComponentConfigurationResponseData>(
    data,
    undefined,
    'component'
  );
};

const normalizeContentTypeSettingsResponse = (
  data: unknown
): FindContentTypesSettings.Response['data'] => {
  if (!Array.isArray(data)) {
    warnOnceInDevelopment(
      'Received malformed content-type settings response. Falling back to empty.'
    );
    return [];
  }

  return data
    .filter((entry, index): entry is Record<string, unknown> => {
      const isValidEntry = isRecord(entry);

      if (!isValidEntry) {
        warnOnceInDevelopment(`Dropped malformed content-type settings entry "${index}".`);
      }

      return isValidEntry;
    })
    .filter((entry): entry is Record<string, unknown> & { uid: string } => {
      const hasUid = typeof entry.uid === 'string';

      if (!hasUid) {
        warnOnceInDevelopment('Dropped content-type settings entry without a uid.');
      }

      return hasUid;
    })
    .map((entry) => ({
      uid: entry.uid,
      settings: normalizeResponseSettings(entry.settings, `contentTypeSettings.${entry.uid}`),
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
