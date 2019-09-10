import React from 'react';
import { get } from 'lodash';
import pluginId from '../../../pluginId';

/**
 * Retrieve external links from injected components
 * @type {Array} List of external links to display
 */
const getInjectedComponents = (
  area,
  plugins,
  currentEnvironment,
  slug,
  source,
  emitEvent
) => {
  const componentsToInject = Object.keys(plugins).reduce((acc, current) => {
    // Retrieve injected compos from plugin
    // if compo can be injected in left.links area push the compo in the array
    const currentPlugin = plugins[current];
    const injectedComponents = get(currentPlugin, 'injectedComponents', []);

    const compos = injectedComponents
      .filter(compo => {
        return compo.plugin === `${pluginId}.editPage` && compo.area === area;
      })
      .map(compo => {
        const Component = compo.component;

        return (
          <Component
            currentEnvironment={currentEnvironment}
            getModelName={() => slug}
            getSource={() => source}
            getContentTypeBuilderBaseUrl={() =>
              '/plugins/content-type-builder/models/'
            }
            {...compo.props}
            key={compo.key}
            onClick={() => {
              emitEvent('willEditContentTypeFromEditView');
            }}
          />
        );
      });

    return [...acc, ...compos];
  }, []);

  return componentsToInject;
};

export default getInjectedComponents;
