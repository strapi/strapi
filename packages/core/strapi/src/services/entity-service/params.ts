import { pick } from 'lodash/fp';

const pickSelectionParams = pick(['fields', 'populate']);

export { pickSelectionParams };
