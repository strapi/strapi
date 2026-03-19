/* eslint-disable check-file/no-index */

import { PreviewSidePanel } from './components/PreviewSidePanel';

import type { ContentManagerPlugin, PanelComponent } from '../content-manager';
import type { PluginDefinition } from '@strapi/admin/strapi-admin';

const previewAdmin: Partial<PluginDefinition> = {
  bootstrap(app) {
    const contentManagerPluginApis = app.getPlugin('content-manager')
      .apis as ContentManagerPlugin['config']['apis'];

    contentManagerPluginApis.addEditViewSidePanel((panels) => {
      // Insert PreviewSidePanel after the actions panel
      const actionsPanelIndex = panels.findIndex(
        (panel) => (panel as PanelComponent).type === 'actions'
      );
      return [
        ...panels.slice(0, actionsPanelIndex + 1),
        PreviewSidePanel,
        ...panels.slice(actionsPanelIndex + 1),
      ];
    });
  },
};

export { previewAdmin };
