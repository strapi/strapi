import { useContext } from 'react';

import { FormModalNavigationContext } from '../contexts/FormModalNavigationContext';

export const useFormModalNavigation = () => useContext(FormModalNavigationContext);
