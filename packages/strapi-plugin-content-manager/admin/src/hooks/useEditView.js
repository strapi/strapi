import { useContext } from 'react';
import EditViewContext from '../contexts/EditView';

const useEditView = () => useContext(EditViewContext);

export default useEditView;
