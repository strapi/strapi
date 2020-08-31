import { omit } from 'lodash';

const removePublishedAtFromMetas = metas => omit(metas, ['published_at']);

export default removePublishedAtFromMetas;
