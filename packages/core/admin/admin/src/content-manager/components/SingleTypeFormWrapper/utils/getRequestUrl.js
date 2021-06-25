import { getRequestUrl } from '../../../utils';

const requestURL = path => getRequestUrl(`single-types/${path}`);

export default requestURL;
