import { useContext } from 'react';
import { AppContext } from '../../contexts';

const useAppContext = () => useContext(AppContext);

export default useAppContext;
