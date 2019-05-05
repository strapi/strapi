import { createBrowserHistory } from 'history';
import basename from './basename';

const history = createBrowserHistory({ basename });

export default history;
