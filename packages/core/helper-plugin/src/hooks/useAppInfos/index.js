/**
 *
 * useAppInfos
 *
 */

import { useContext } from 'react';
import AppInfosContext from '../../contexts/AppInfosContext';

const useAppInfos = () => {
  const appInfos = useContext(AppInfosContext);

  return appInfos;
};

export default useAppInfos;
