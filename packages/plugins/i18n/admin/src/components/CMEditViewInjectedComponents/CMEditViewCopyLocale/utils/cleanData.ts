import {
  contentManagementUtilRemoveFieldsFromData,
  formatContentTypeData,
} from '@strapi/helper-plugin';

import removePasswordAndRelationsFieldFromData from './removePasswordAndRelationsFieldFromData';

const cleanData = (
  data: any,
  {
    contentType,
    components,
  }: {
    contentType?: any;
    components: any;
  },
  initialLocalizations: any
) => {
  const dataWithoutPasswordsAndRelations = removePasswordAndRelationsFieldFromData(
    data,
    contentType,
    components
  );

  dataWithoutPasswordsAndRelations.localizations = initialLocalizations;

  const fieldsToRemove = ['createdBy', 'updatedBy', 'publishedAt', 'id', 'updatedAt', 'createdAt'];

  const cleanedClonedData = contentManagementUtilRemoveFieldsFromData(
    dataWithoutPasswordsAndRelations,
    contentType,
    components,
    fieldsToRemove
  );

  return formatContentTypeData(cleanedClonedData, contentType, components);
};

export default cleanData;
