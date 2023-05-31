import sortBy from 'lodash/sortBy';

const sortLinks = (links) => sortBy(links, (object) => object.name);

export default sortLinks;
