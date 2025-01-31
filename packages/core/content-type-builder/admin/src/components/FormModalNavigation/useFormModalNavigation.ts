import { useContext } from 'react';

import { FormModalNavigationContext } from './FormModalNavigationContext';

export const useFormModalNavigation = () => useContext(FormModalNavigationContext);
