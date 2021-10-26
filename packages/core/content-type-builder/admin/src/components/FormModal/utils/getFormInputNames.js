const getFormInputNames = form =>
  form.reduce((acc, current) => {
    const names = current.items.reduce((acc, current) => {
      if (current.name) {
        acc.push(current.name);
      }

      return acc;
    }, []);

    return [...acc, ...names];
  }, []);

export default getFormInputNames;
