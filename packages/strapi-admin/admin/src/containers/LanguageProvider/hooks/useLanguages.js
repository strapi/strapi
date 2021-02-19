import { useSelector, useDispatch } from 'react-redux';
import { changeLocale } from '../actions';

const languageSelector = state => state.get('language').toJS();

const useLanguages = () => {
  const { locale } = useSelector(languageSelector);
  const dispatch = useDispatch();

  const selectLanguage = nextLocale => dispatch(changeLocale(nextLocale));

  return { currentLanguage: locale, selectLanguage };
};

export default useLanguages;
