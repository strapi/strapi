import {
  contentManagementUtilRemoveFieldsFromData,
  formatComponentData,
} from 'strapi-helper-plugin';
import removePasswordAndRelationsFieldFromData from './removePasswordAndRelationsFieldFromData';

const cleanData = (data, { contentType, components }, initialLocalizations) => {
  const dataWithoutPasswordsAndRelations = removePasswordAndRelationsFieldFromData(
    data,
    contentType,
    components
  );

  dataWithoutPasswordsAndRelations.localizations = initialLocalizations;

  const cleanedClonedData = contentManagementUtilRemoveFieldsFromData(
    dataWithoutPasswordsAndRelations,
    contentType,
    components
  );

  return formatComponentData(cleanedClonedData, contentType, components);
};

export default cleanData;
