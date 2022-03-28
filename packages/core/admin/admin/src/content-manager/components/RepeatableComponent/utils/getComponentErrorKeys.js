import take from 'lodash/take';

export default function getComponentErrorKeys(name, formErrors, isNested = false) {
  return Object.keys(formErrors)
    .filter((errorKey) => {
      return take(errorKey.split('.'), isNested ? 2 : 1).join('.') === name;
    })
    .map((errorKey) => {
      return errorKey
        .split('.')
        .slice(0, name.split('.').length + 1)
        .join('.');
    });
}
