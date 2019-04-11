import { createBrowserHistory } from 'history';

const basename = PUBLIC_PATH.replace(window.location.origin, '');
const history = createBrowserHistory({ basename });

export default history;
