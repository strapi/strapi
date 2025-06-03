import { castArray } from 'lodash/fp';
import strapiUtils from '@strapi/utils';

const { isVisibleAttribute } = strapiUtils.contentTypes;
/**
 * sumDraftCounts works recursively on the attributes of a model counting the
 * number of draft relations
 * These relations can be direct to this content type or contained within components/dynamic zones
 * @param {Object} entity containing the draft relation counts
 * @param {String} uid of the content type
 * @returns {Number} of draft relations
 */
const sumDraftCounts = (entity: any, uid: any): number => {
  const model = strapi.getModel(uid);

  return Object.keys(model.attributes).reduce((sum, attributeName) => {
    const attribute: any = model.attributes[attributeName];
    const value = entity[attributeName];
    if (!value) {
      return sum;
    }

    switch (attribute.type) {
      case 'relation': {
        if (isVisibleAttribute(model, attributeName)) {
          return sum + value.count;
        }
        return sum;
      }
      case 'component': {
        const compoSum = castArray(value).reduce((acc, componentValue) => {
          return acc + sumDraftCounts(componentValue, attribute.component);
        }, 0);
        return sum + compoSum;
      }
      case 'dynamiczone': {
        const dzSum = value.reduce((acc: any, componentValue: any) => {
          return acc + sumDraftCounts(componentValue, componentValue.__component);
        }, 0);
        return sum + dzSum;
      }
      default:
        return sum;
    }
  }, 0);
};

export { sumDraftCounts };
