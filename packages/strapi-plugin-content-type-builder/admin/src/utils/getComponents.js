import React from 'react';
import { get } from 'lodash';
import pluginId from '../pluginId';

/**
 * Retrieve external links from injected components
 * @type {Array} List of external links to display
 */
const getInjectedComponents = (container, area, plugins, rest) => {
  const componentsToInject = Object.keys(plugins).reduce((acc, current) => {
    // Retrieve injected compos from plugin
    const currentPlugin = plugins[current];
    const injectedComponents = get(currentPlugin, 'injectedComponents', []);

    const compos = injectedComponents
      .filter(compo => {
        return compo.plugin === `${pluginId}.${container}` && compo.area === area;
      })
      .map(compo => {
        const Component = compo.component;

        return <Component {...compo} {...rest} key={compo.key} />;
      });

    return [...acc, ...compos];
  }, []);

  return componentsToInject;
};

export default getInjectedComponents;
