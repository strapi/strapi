import { useContext } from 'react';
import LayoutDndContext from '../contexts/LayoutDnd';

const useLayoutDnd = () => useContext(LayoutDndContext);

export default useLayoutDnd;
