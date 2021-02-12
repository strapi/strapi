import createDefaultForm from './utils/createdDefaultForm';

const init = layout => {
  const defaultForm = createDefaultForm(layout);

  return {
    initialData: defaultForm,
    modifiedData: defaultForm,
  };
};

export default init;
