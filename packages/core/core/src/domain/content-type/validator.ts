import _ from 'lodash';
import { yup, strings } from '@strapi/utils';
import type { Schema } from '@strapi/types';

const LIFECYCLES = [
  'beforeCreate',
  'afterCreate',
  'beforeFindOne',
  'afterFindOne',
  'beforeFindMany',
  'afterFindMany',
  'beforeCount',
  'afterCount',
  'beforeCreateMany',
  'afterCreateMany',
  'beforeUpdate',
  'afterUpdate',
  'beforeUpdateMany',
  'afterUpdateMany',
  'beforeDelete',
  'afterDelete',
  'beforeDeleteMany',
  'afterDeleteMany',
] as const;

/**
 * For enumerations the least common denomiator is GraphQL, where
 * values needs to match the secure name regex:
 * GraphQL Spec https://spec.graphql.org/June2018/#sec-Names
 *
 * Therefore we need to make sure our users only use values, which
 * can be returned by GraphQL, by checking the regressed values
 * agains the GraphQL regex.
 *
 * TODO V5: check if we can avoid this coupling by moving this logic
 * into the GraphQL plugin.
 */
const GRAPHQL_ENUM_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/;

const lifecyclesShape = _.mapValues(_.keyBy(LIFECYCLES), () => yup.mixed().nullable().isFunction());

const contentTypeSchemaValidator = yup.object().shape({
  schema: yup.object().shape({
    info: yup
      .object()
      .shape({
        displayName: yup.string().required(),
        singularName: yup.string().isKebabCase().required(),
        pluralName: yup.string().isKebabCase().required(),
      })
      .required(),
    attributes: yup.object().test({
      name: 'valuesCollide',
      message: 'Some values collide when normalized',
      test(attributes: Schema.ContentType['attributes']) {
        for (const attrName of Object.keys(attributes)) {
          const attr = attributes[attrName];
          if (attr.type === 'enumeration') {
            const regressedValues = attr.enum.map(strings.toRegressedEnumValue);

            // should match the GraphQL regex
            if (!regressedValues.every((value: string) => GRAPHQL_ENUM_REGEX.test(value))) {
              const message = `Invalid enumeration value. Values should have at least one alphabetical character preceding the first occurence of a number. Update your enumeration '${attrName}'.`;

              return this.createError({ message });
            }

            // should not contain empty values
            if (regressedValues.some((value: string) => value === '')) {
              return this.createError({
                message: `At least one value of the enumeration '${attrName}' appears to be empty. Only alphanumerical characters are taken into account.`,
              });
            }

            // should not collide
            const duplicates = _.uniq(
              regressedValues.filter(
                (value: string, index: number, values: string[]) => values.indexOf(value) !== index
              )
            );

            if (duplicates.length) {
              const message = `Some enumeration values of the field '${attrName}' collide when normalized: ${duplicates.join(
                ', '
              )}. Please modify your enumeration.`;

              return this.createError({ message });
            }
          }
        }

        return true;
      },
    }),
  }),
  actions: yup.object().onlyContainsFunctions(),
  lifecycles: yup.object().shape(lifecyclesShape).noUnknown(),
});

const validateContentTypeDefinition = (data: unknown) => {
  return contentTypeSchemaValidator.validateSync(data, { strict: true, abortEarly: false });
};

export { validateContentTypeDefinition };
