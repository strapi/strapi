import { useContext } from 'react';
import ListViewContext from '../contexts/ListView';

const useListView = () => useContext(ListViewContext);

export default useListView;
