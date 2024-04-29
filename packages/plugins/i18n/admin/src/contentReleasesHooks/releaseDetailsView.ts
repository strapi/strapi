import { Attribute } from '@strapi/types';
/* -------------------------------------------------------------------------------------------------
 * addLocaleToReleasesHook
 * -----------------------------------------------------------------------------------------------*/
interface AddLocaleToReleasesHookArgs {
  displayedHeaders: {
    key: string;
    fieldSchema: Attribute.Kind | 'custom';
    metadatas: {
      label: { id: string; defaultMessage: string };
      searchable: boolean;
      sortable: boolean;
    };
    name: string;
  }[];
  hasI18nEnabled: boolean;
}

const addLocaleToReleasesHook = ({ displayedHeaders = [] }: AddLocaleToReleasesHookArgs) => {
  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        key: '__locale__',
        fieldSchema: { type: 'string' },
        metadatas: {
          label: {
            id: 'content-releases.page.ReleaseDetails.table.header.label.locale',
            defaultMessage: 'locale',
          },
          searchable: false,
          sortable: false,
        },
        name: 'locale',
      },
    ],
    hasI18nEnabled: true,
  };
};

export { addLocaleToReleasesHook };
