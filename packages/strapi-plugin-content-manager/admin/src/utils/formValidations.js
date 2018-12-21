import {
  findIndex,
  forEach,
  includes,
  isArray,
  isBoolean,
  isEmpty,
  isNaN,
  isNull,
  isNumber,
  isObject,
  isUndefined,
  map,
  mapKeys,
  reject,
} from 'lodash';

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
    if (value.name) {
      formValidations.push({ name: value.name, validations: value.validations });
    }
  });

  return formValidations;
}


export function checkFormValidity(formData, formValidations) {
  const errors = [];

  forEach(formData, (value, key) => {
    const validationValue = formValidations[findIndex(formValidations, ['name', key])];

    if (!isUndefined(validationValue)) {
      const inputErrors = validate(value, validationValue.validations);

      if (!isEmpty(inputErrors)) {
        errors.push({ name: key, errors: inputErrors });
      }

    }
  });

  return errors;
}

function validate(value, validations) {
  let errors = [];
  // Handle i18n
  const requiredError = { id: 'content-manager.error.validation.required' };
  mapKeys(validations, (validationValue, validationKey) => {
    switch (validationKey) {
      case 'max':
        if (parseInt(value, 10) > validationValue) {
          errors.push({ id: 'content-manager.error.validation.max' });
        }
        break;
      case 'min':
        if (parseInt(value, 10) < validationValue) {
          errors.push({ id: 'content-manager.error.validation.min' });
        }
        break;
      case 'maxLength':
        if (value.length > validationValue) {
          errors.push({ id: 'content-manager.error.validation.maxLength' });
        }
        break;
      case 'minLength':
        if (value.length < validationValue) {
          errors.push({ id: 'content-manager.error.validation.minLength' });
        }
        break;
      case 'required':
        if (validationValue === true && value.length === 0) {
          errors.push({ id: 'content-manager.error.validation.required' });
        }
        break;
      case 'regex':
        if (!new RegExp(validationValue).test(value)) {
          errors.push({ id: 'content-manager.error.validation.regex' });
        }
        break;
      case 'type':
        if (validationValue === 'json') {
          try {
            if (isObject(value) || isBoolean(value) || isNumber(value) || isArray(value) || isNaN(value) || isNull(value)) {
              value = JSON.parse(JSON.stringify(value));
            } else {
              errors.push({ id: 'content-manager.error.validation.json' });
            }
          } catch(err) {
            errors.push({ id: 'content-manager.error.validation.json' });
          }
        }
        break;
      default:
    }
  });

  if (includes(errors, requiredError)) {
    errors = reject(errors, (error) => error !== requiredError);
  }
  return errors;
}
