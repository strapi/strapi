import sortBy from 'lodash/sortBy';

const sortLinks = links => sortBy(links, link => link.id);

export default sortLinks;
