import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect() {
  const { addRepeatableComponentToField, formErrors } = useCMEditViewDataManager();

  return {
    addRepeatableComponentToField,
    formErrors,
  };
}

export default useSelect;
