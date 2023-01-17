import { sortBy } from 'lodash';

const sortLinks = (links) => sortBy(links, (object) => object.name);

export default sortLinks;
