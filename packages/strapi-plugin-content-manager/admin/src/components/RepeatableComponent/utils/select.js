import useDataManager from '../../../hooks/useDataManager';

function useSelect() {
  const { addRepeatableComponentToField, formErrors } = useDataManager();

  return {
    addRepeatableComponentToField,
    formErrors,
  };
}

export default useSelect;
