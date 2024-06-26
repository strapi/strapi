import type { Plugin } from '@strapi/types';
import type { StrapiApp } from '@strapi/admin/strapi-admin';
import { DocumentActionComponent } from 'src';
import { HistoryAction } from './components/HistoryAction';
import { ContentManagerPlugin } from 'src/content-manager';

const historyAdmin: Partial<Plugin.Config.AdminInput> = {
  bootstrap(app: StrapiApp) {
    const { addDocumentAction } = app.getPlugin('content-manager').apis as {
      addDocumentAction: ContentManagerPlugin['addDocumentAction'];
    };

    /**
     * Register the document action here using the public API, and not by setting the action in the
     * Content Manager directly, because this API lets us control the order of the actions array.
     * We want history to be the last non-delete action in the array.
     */
    addDocumentAction((actions) => {
      const indexOfDeleteAction = actions.findIndex((action) => action.type === 'delete');
      actions.splice(indexOfDeleteAction, 0, HistoryAction);
      return actions;
    });
  },
};

export { historyAdmin };
