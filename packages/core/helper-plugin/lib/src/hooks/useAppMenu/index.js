/**
 *
 * useAppMenu
 *
 */

import { useContext, useRef } from 'react';
import AppMenuContext from '../../contexts/AppMenuContext';

const useAppMenu = () => {
  const updateMenu = useContext(AppMenuContext);
  const updateMenuRef = useRef(updateMenu);

  return updateMenuRef.current;
};

export default useAppMenu;
