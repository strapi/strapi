export function getNestedComponentValue(values, name) {
  if (!values || !name) return;

  const componentsNames = name.split('.');

  if (!componentsNames.length) return;

  if (componentsNames.length === 1) {
    return values[name];
  }

  return componentsNames.reduce((currentValue, name) => {
    if (!currentValue) return;

    return currentValue[name];
  }, values);
}
