import { ComponentsDictionary } from '../hooks/useContentTypeSchema';
import { EditLayout, convertEditLayoutToFieldLayouts } from '../hooks/useDocumentLayout';

import type { Component, FindComponentConfiguration } from '../../../shared/contracts/components';

/**
 * Formats API configuration + schemas into the shape expected by the component
 * "Configure the view" form. Matches the ListView / content-type path: nested
 * `convertEditLayoutToFieldLayouts` calls must receive component configuration
 * and full component schemas so `getMainField` can resolve fields inside nested
 * component attributes (see #25509).
 */
const formatComponentConfigurationEditLayout = (
  data: FindComponentConfiguration.Response['data'],
  { schema, components }: { schema?: Component; components: ComponentsDictionary }
): EditLayout => {
  const editAttributes = convertEditLayoutToFieldLayouts(
    data.component.layouts.edit,
    schema?.attributes,
    data.component.metadatas,
    { configurations: data.components, schemas: components }
  );

  const componentEditAttributes = Object.entries(data.components).reduce<EditLayout['components']>(
    (acc, [uid, configuration]) => {
      acc[uid] = {
        layout: convertEditLayoutToFieldLayouts(
          configuration.layouts.edit,
          components[uid].attributes,
          configuration.metadatas,
          { configurations: data.components, schemas: components }
        ),
        settings: {
          ...configuration.settings,
          icon: components[uid].info.icon,
          displayName: components[uid].info.displayName,
        },
      };
      return acc;
    },
    {}
  );

  const editMetadatas = Object.entries(data.component.metadatas).reduce<EditLayout['metadatas']>(
    (acc, [attribute, metadata]) => {
      return {
        ...acc,
        [attribute]: metadata.edit,
      };
    },
    {}
  );

  return {
    layout: [editAttributes],
    components: componentEditAttributes,
    metadatas: editMetadatas,
    options: {
      ...schema?.options,
      ...schema?.pluginOptions,
    },
    settings: {
      ...data.component.settings,
      displayName: schema?.info.displayName,
    },
  };
};

export { formatComponentConfigurationEditLayout };
