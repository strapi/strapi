import sortBy from 'lodash/sortBy';

const sortLinks = links => sortBy(links, object => object.id);

export default sortLinks;
