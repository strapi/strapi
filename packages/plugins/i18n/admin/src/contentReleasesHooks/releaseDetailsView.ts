import { Schema } from '@strapi/types';
/* -------------------------------------------------------------------------------------------------
 * addLocaleToReleasesHook
 * -----------------------------------------------------------------------------------------------*/
interface AddLocaleToReleasesHookArgs {
  displayedHeaders: {
    key: string;
    fieldSchema: Schema.Attribute.Kind | 'custom';
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
        label: {
          id: 'content-releases.page.ReleaseDetails.table.header.label.locale',
          defaultMessage: 'locale',
        },
        name: 'locale',
      },
    ],
    hasI18nEnabled: true,
  };
};

export { addLocaleToReleasesHook };
