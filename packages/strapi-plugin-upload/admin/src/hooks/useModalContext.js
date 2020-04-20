import { useContext } from 'react';
import InputModalDataManagerContext from '../contexts/InputModal/InputModalDataManager';

const useModalContext = () => useContext(InputModalDataManagerContext);

export default useModalContext;
