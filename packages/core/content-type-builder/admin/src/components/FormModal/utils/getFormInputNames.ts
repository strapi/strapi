export const getFormInputNames = (form: any) =>
  form.reduce((acc: any, current: any) => {
    const names = current.items.reduce((acc: any, current: any) => {
      if (current.name) {
        acc.push(current.name);
      }

      return acc;
    }, []);

    return [...acc, ...names];
  }, []);
