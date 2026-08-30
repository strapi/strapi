import { ComponentsDictionary } from '../hooks/useContentTypeSchema';
import { EditLayout, convertEditLayoutToFieldLayouts } from '../hooks/useDocumentLayout';
import { normalizeComponentConfigurationLayout } from '../utils/layouts/normalizeContentManagerLayout';

import type { Component, FindComponentConfiguration } from '../../../shared/contracts/components';
import type { Schema } from '../hooks/useDocument';

/**
 * Formats API configuration + schemas into the shape expected by the component
 * "Configure the view" form. Matches the ListView / content-type path: nested
 * `convertEditLayoutToFieldLayouts` calls must receive component configuration
 * and full component schemas so `getMainField` can resolve fields inside nested
 * component attributes (see #25509).
 */
const formatComponentConfigurationEditLayout = (
  data: FindComponentConfiguration.Response['data'],
  {
    schema,
    components,
    schemas = [],
  }: { schema?: Component; components: ComponentsDictionary; schemas?: Schema[] }
): EditLayout => {
  const normalizedData = normalizeComponentConfigurationLayout(data, {
    schema,
    components,
    schemas,
  });

  const editAttributes = convertEditLayoutToFieldLayouts(
    normalizedData.component.layouts.edit,
    schema?.attributes,
    normalizedData.component.metadatas,
    { configurations: normalizedData.components, schemas: components },
    schemas
  );

  const componentEditAttributes = Object.entries(normalizedData.components).reduce<
    EditLayout['components']
  >((acc, [uid, configuration]) => {
    const componentSchema = components[uid];
    if (!componentSchema) {
      return acc;
    }

    acc[uid] = {
      layout: convertEditLayoutToFieldLayouts(
        configuration.layouts.edit,
        componentSchema.attributes,
        configuration.metadatas,
        { configurations: normalizedData.components, schemas: components },
        schemas
      ),
      settings: {
        ...configuration.settings,
        icon: componentSchema.info.icon,
        displayName: componentSchema.info.displayName,
      },
    };
    return acc;
  }, {});

  const editMetadatas = Object.entries(normalizedData.component.metadatas).reduce<
    EditLayout['metadatas']
  >((acc, [attribute, metadata]) => {
    return {
      ...acc,
      [attribute]: metadata.edit,
    };
  }, {});

  return {
    layout: [editAttributes],
    components: componentEditAttributes,
    metadatas: editMetadatas,
    options: {
      ...schema?.options,
      ...schema?.pluginOptions,
    },
    settings: {
      ...normalizedData.component.settings,
      displayName: schema?.info.displayName,
    },
  };
};

export { formatComponentConfigurationEditLayout };
