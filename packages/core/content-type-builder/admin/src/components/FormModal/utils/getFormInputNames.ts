type FormInput = {
  name?: string;
};

type FormSection = {
  items: FormInput[];
};

export const getFormInputNames = (form: FormSection[]) =>
  form.reduce<string[]>((acc, current) => {
    const names = current.items.reduce<string[]>((acc, current) => {
      if (current.name !== undefined) {
        acc.push(current.name);
      }

      return acc;
    }, []);

    return [...acc, ...names];
  }, []);
