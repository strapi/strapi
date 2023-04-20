/**
 *
 * useRBACProvider
 *
 */

import { useContext } from 'react';
import RBACProviderContext from '../../contexts/RBACProviderContext';

const useRBACProvider = () => useContext(RBACProviderContext);

export default useRBACProvider;
