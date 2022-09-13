import { useContext } from 'react';
import FormModalNavigationContext from '../contexts/FormModalNavigationContext';

const useFormModalNavigation = () => useContext(FormModalNavigationContext);

export default useFormModalNavigation;
