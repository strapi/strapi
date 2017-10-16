import { get, filter, isNumber, size, split, isEmpty, has, map, concat } from 'lodash';

export default function checkAttributeValidations(errors) {

  const attributeIndex = split(this.props.hash, '::')[3];
  const sameAttributes = filter(this.props.contentTypeData.attributes, (attr) => attr.name === this.props.modifiedDataAttribute.name);
  const sameParamsKey = filter(this.props.contentTypeData.attributes, (attr) => attr.params.key === this.props.modifiedDataAttribute.params.key);
  const sameParamsKeyAndName = filter(this.props.contentTypeData.attributes, (attr) => attr.name === this.props.modifiedDataAttribute.params.key);
  const formErrors = concat(errors, hasNestedValue(this.props.modifiedDataAttribute));
  const isEditingParamsKey = this.props.modifiedDataAttribute.params.key !== get(this.props.contentTypeData.attributes, [attributeIndex, 'params', 'key']);

  // Check if params key is filled
  if (has(this.props.modifiedDataAttribute, ['params', 'key'])) {
    if (isEmpty(this.props.modifiedDataAttribute.params.key)) {
      formErrors.push({ name: 'params.key', errors: [{ id: 'content-type-builder.error.validation.required' }] });
    }
  }

  // Check attribute name uniqueness
  if (size(sameAttributes) > 0 && this.props.modifiedDataAttribute.name !== get(this.props.contentTypeData.attributes, [attributeIndex, 'name'])) {
    formErrors.push({ name: 'name', errors: [{ id: 'content-type-builder.error.attribute.taken' }]});
  }

  // Check key uniqueness
  if (size(sameParamsKey) > 0 && isEditingParamsKey) {
    formErrors.push({ name: 'params.key', errors: [{ id: 'content-type-builder.error.attribute.key.taken' }]});
  }

  if (size(sameParamsKeyAndName) > 0 && isEditingParamsKey) {
    formErrors.push({ name: 'params.key', errors: [{ id: 'content-type-builder.error.attribute.key.taken' }]});
  }


  if (get(this.props.modifiedDataAttribute, 'name') === get(this.props.modifiedDataAttribute.params, 'key') && this.props.modifiedDataAttribute.params.target === this.props.modelName) {
    formErrors.push({ name: 'params.key', errors: [{ id: 'content-type-builder.error.attribute.sameKeyAndName' }]});
  }

  return formErrors;
}


const hasNestedValue = (attributeData) => {
  const formErrors = [];
  const keys = [
    'min',
    'minLength',
    'max',
    'maxLength',
  ];

  map(keys, (key) => {
    if (get(attributeData, ['params', key])) {
      if (!isNumber(get(attributeData, ['params', `${key}Value`]))) {
        formErrors.push({ name: `params.${key}Value`, errors: [{ id: 'content-type-builder.error.validation.required' }] });
      }
    }
  });

  if (isNumber(get(attributeData.params, 'maxValue')) && get(attributeData.params, ['minValue']) > get(attributeData.params, 'maxValue')) {
    formErrors.push({ name: 'params.minValue', errors: [{ id: 'content-type-builder.error.validation.minSupMax' } ] });
  }

  if (isNumber(get(attributeData.params, 'maxLengthValue')) && get(attributeData.params, ['minLengthValue']) > get(attributeData.params, 'maxLengthValue')) {
    formErrors.push({ name: 'params.minLengthValue', errors: [{ id: 'content-type-builder.error.validation.minSupMax' } ] });
  }

  return formErrors;
};
