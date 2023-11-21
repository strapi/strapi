/* eslint-disable check-file/filename-naming-convention */
import { LocaleListCell } from '../components/LocaleListCell';
import { doesPluginOptionsHaveI18nLocalized } from '../utils/fields';

import type { CMAdminConfiguration } from '../types';

/* -------------------------------------------------------------------------------------------------
 * addColumnToTableHook
 * -----------------------------------------------------------------------------------------------*/

interface AddColumnToTableHookArgs {
  layout: {
    components: Record<string, CMAdminConfiguration>;
    contentType: CMAdminConfiguration;
  };
  /**
   * TODO: this should come from the admin package.
   */
  displayedHeaders: unknown[];
}

const addColumnToTableHook = ({ displayedHeaders, layout }: AddColumnToTableHookArgs) => {
  const { contentType } = layout;

  const isFieldLocalized = doesPluginOptionsHaveI18nLocalized(contentType.pluginOptions)
    ? contentType.pluginOptions.i18n.localized
    : false;

  if (!isFieldLocalized) {
    return { displayedHeaders, layout };
  }

  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        key: '__locale_key__',
        fieldSchema: { type: 'string' },
        metadatas: { label: 'Content available in', searchable: false, sortable: false },
        name: 'locales',
        cellFormatter: (props: object) => <LocaleListCell {...props} />,
      },
    ],
    layout,
  };
};

export { addColumnToTableHook };
