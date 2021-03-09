import { useSelector, useDispatch } from 'react-redux';

const selectContentManagerInitialParams = state => state.get('content-manager_listView');

const useChangeInitialParams = () => {
  const dispatch = useDispatch();
  const { contentType, displayedHeaders, initialParams } = useSelector(
    selectContentManagerInitialParams
  );

  const changeInitialparams = nextLocale => {
    const nextInitialParams = {
      ...initialParams,
      pluginOptions: { ...initialParams.pluginOptions, locale: nextLocale },
    };

    const action = {
      type: 'ContentManager/ListView/SET_LIST_LAYOUT ',
      contentType,
      displayedHeaders,
      initialParams: nextInitialParams,
    };

    dispatch(action);
  };

  return changeInitialparams;
};

export default useChangeInitialParams;
