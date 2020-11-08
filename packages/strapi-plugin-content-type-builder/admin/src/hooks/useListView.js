import { useContext } from 'react';
import ListViewContext from '../contexts/ListViewContext';

const useListView = () => useContext(ListViewContext);

export default useListView;
