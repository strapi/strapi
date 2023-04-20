const createDefaultForm = (attributes, allComponentsSchema) => {
  return Object.entries(attributes)
    .filter(([, value]) => typeof value === 'object')
    .reduce((acc, [key, value]) => {
      const { default: defaultValue, component, type, required, min, repeatable } = value;

      if (defaultValue !== undefined) {
        acc[key] = defaultValue;
      }

      if (type === 'component') {
        const currentComponentSchema = allComponentsSchema?.[component]?.attributes ?? {};
        const currentComponentDefaultForm = createDefaultForm(
          currentComponentSchema,
          allComponentsSchema
        );

        if (required === true) {
          acc[key] = repeatable === true ? [] : currentComponentDefaultForm;
        }

        if (min && repeatable === true && required) {
          acc[key] = [];

          for (let i = 0; i < min; i += 1) {
            acc[key].push(currentComponentDefaultForm);
          }
        }
      }

      if (type === 'dynamiczone') {
        if (required === true) {
          acc[key] = [];
        }
      }

      return acc;
    }, {});
};

export default createDefaultForm;
