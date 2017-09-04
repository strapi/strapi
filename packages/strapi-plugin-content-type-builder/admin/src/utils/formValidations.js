import { forEach, isObject, isArray, map } from 'lodash';

/* eslint-disable consistent-return */
export function getValidationsFromForm(form, formValidations) {
  map(form, (value, key) => {

    // Check if the object
    if (isObject(value) && !isArray(value)) {
      forEach(value, (subValue) => {
        // Check if it has nestedInputs
        if (isArray(subValue) && value.type !== 'select') {
          return getValidationsFromForm(subValue, formValidations);
        }
      });
    }


    if (isArray(value) && value.type !== 'select') {
      return getValidationsFromForm(form[key], formValidations);
    }


    // Push the target and the validation
    if (value.target) {
      formValidations.push({ target: value.target, validations: value.validations });
    }
  });

  return formValidations;
}
