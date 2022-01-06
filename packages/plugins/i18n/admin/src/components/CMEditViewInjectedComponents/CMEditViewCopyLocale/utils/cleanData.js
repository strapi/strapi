import {
  contentManagementUtilRemoveFieldsFromData,
  formatComponentData,
} from '@strapi/helper-plugin';
import removePasswordAndRelationsFieldFromData from './removePasswordAndRelationsFieldFromData';

const cleanData = (data, { contentType, components }, initialLocalizations) => {
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

  return formatComponentData(cleanedClonedData, contentType, components);
};

export default cleanData;
