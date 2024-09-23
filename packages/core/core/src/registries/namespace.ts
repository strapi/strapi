const hasNamespace = (name: string, namespace: string) => {
  if (!namespace) {
    return true;
  }

  if (namespace.endsWith('::')) {
    return name.startsWith(namespace);
  }
  return name.startsWith(`${namespace}.`);
};

const addNamespace = (name: string, namespace: string) => {
  if (namespace.endsWith('::')) {
    return `${namespace}${name}`;
  }
  return `${namespace}.${name}`;
};

const removeNamespace = (name: string, namespace: string) => {
  if (namespace.endsWith('::')) {
    return name.replace(namespace, '');
  }
  return name.replace(`${namespace}.`, '');
};

export { addNamespace, removeNamespace, hasNamespace };
