/* eslint-disable check-file/filename-naming-convention */
import { LocaleListCell } from '../components/LocaleListCell';
import { doesPluginOptionsHaveI18nLocalized } from '../utils/fields';
import { getTranslation } from '../utils/getTranslation';

import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * addColumnToTableHook
 * -----------------------------------------------------------------------------------------------*/
interface AddColumnToTableHookArgs {
  layout: ListLayout;
  displayedHeaders: ListFieldLayout[];
}

type CellFormatterArgs = Parameters<NonNullable<ListFieldLayout['cellFormatter']>>;

const addColumnToTableHook = ({ displayedHeaders, layout }: AddColumnToTableHookArgs) => {
  const { options } = layout;

  const isFieldLocalized = doesPluginOptionsHaveI18nLocalized(options)
    ? options.i18n.localized
    : false;

  if (!isFieldLocalized) {
    return { displayedHeaders, layout };
  }

  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        attribute: { type: 'string' },
        label: {
          id: getTranslation('list-view.table.header.label'),
          defaultMessage: 'Available in',
        },
        searchable: false,
        sortable: false,
        name: 'locales',
        cellFormatter: (props: CellFormatterArgs[0]) => (
          <LocaleListCell
            documentId={props.documentId}
            locale={props.locale}
            localizations={props.localizations}
          />
        ),
      },
    ],
    layout,
  };
};

export { addColumnToTableHook };
