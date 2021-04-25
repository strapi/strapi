import { useDispatch } from 'react-redux';
import { changeLocale } from '../actions';

const useChangeLanguage = () => {
  const dispatch = useDispatch();

  const changeLanguage = nextLocale => {
    dispatch(changeLocale(nextLocale));
  };

  return changeLanguage;
};

export default useChangeLanguage;
