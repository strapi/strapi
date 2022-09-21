import * as yup from 'yup';
import { toLower, trim } from 'lodash';
import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import { nameToCollectionName } from '@strapi/utils/lib';
import getTrad from '../../../utils/getTrad';
import { createUid } from '../utils/createUid';

const createContentTypeSchema = ({
  usedContentTypeNames = [],
  reservedModels = [],
  reservedCollectionNames = [],
  singularNames = [],
  pluralNames = [],
}) => {
  const shape = {
    displayName: yup
      .string()
      .test({
        name: 'nameAlreadyUsed',
        message: errorsTrads.unique,
        test(value) {
          if (!value) {
            return false;
          }

          const name = createUid(value);

          return !usedContentTypeNames.includes(name);
        },
      })
      .test({
        name: 'nameNotAllowed',
        message: getTrad('error.contentTypeName.reserved-name'),
        test(value) {
          if (!value) {
            return false;
          }

          return !reservedModels.includes(toLower(trim(value)));
        },
      })
      .required(errorsTrads.required),
    pluralName: yup
      .string()
      .test({
        name: 'pluralNameAlreadyUsed',
        message: errorsTrads.unique,
        test(value) {
          if (!value) {
            return false;
          }

          return !pluralNames.includes(value);
        },
      })
      .test({
        name: 'pluralAndSingularAreUnique',
        message: getTrad('error.contentType.pluralName-used'),
        test(value, context) {
          if (!value) {
            return false;
          }

          return context.parent.singularName !== value;
        },
      })
      .test({
        name: 'pluralNameNotAllowed',
        message: getTrad('error.contentTypeName.reserved-name'),
        test(value) {
          if (!value) {
            return false;
          }

          return !reservedModels.includes(toLower(trim(value)));
        },
      })
      .test({
        name: 'pluralCollectionNameNotAllowed',
        message: getTrad('error.contentTypeName.reserved-name'),
        test(value) {
          // test whether the given plural name will create a conflict with a
          // default DB table name
          if (!value) {
            return false;
          }

          return !reservedCollectionNames.includes(nameToCollectionName(toLower(trim(value))));
        },
      })
      .required(errorsTrads.required),
    singularName: yup
      .string()
      .test({
        name: 'singularNameAlreadyUsed',
        message: errorsTrads.unique,
        test(value) {
          if (!value) {
            return false;
          }

          return !singularNames.includes(value);
        },
      })
      .test({
        name: 'pluralAndSingularAreUnique',
        message: getTrad('error.contentType.singularName-used'),
        test(value, context) {
          if (!value) {
            return false;
          }

          return context.parent.pluralName !== value;
        },
      })
      .test({
        name: 'singularNameNotAllowed',
        message: getTrad('error.contentTypeName.reserved-name'),
        test(value) {
          if (!value) {
            return false;
          }

          return !reservedModels.includes(toLower(trim(value)));
        },
      })
      .required(errorsTrads.required),
    draftAndPublish: yup.boolean(),
    kind: yup.string().oneOf(['singleType', 'collectionType']),
  };

  return yup.object(shape);
};

export default createContentTypeSchema;
