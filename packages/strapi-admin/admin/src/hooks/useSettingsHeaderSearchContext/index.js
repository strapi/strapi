import { useContext } from 'react';
import SettingsHeaderSearchContext from '../../contexts/SettingsHeaderSearchContext';

const useSettingsHeaderSearchContext = () => useContext(SettingsHeaderSearchContext);

export default useSettingsHeaderSearchContext;
