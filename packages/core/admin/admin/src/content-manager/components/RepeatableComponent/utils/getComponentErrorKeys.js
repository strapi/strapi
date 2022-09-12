export default function getComponentErrorKeys(name, formErrors) {
  return Object.keys(formErrors)
    .filter((errorKey) => errorKey.startsWith(name))
    .map((errorKey) =>
      errorKey
        .split('.')
        .slice(0, name.split('.').length + 1)
        .join('.')
    );
}
