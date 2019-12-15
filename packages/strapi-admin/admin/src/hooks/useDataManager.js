import { useContext } from 'react';
import WebhooksDataManagerContext from '../contexts/WebhooksDataManager';

const useDataManager = () => useContext(WebhooksDataManagerContext);

export default useDataManager;
