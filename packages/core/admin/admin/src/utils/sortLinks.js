import sortBy from 'lodash/sortBy';

export const sortLinks = (links) => sortBy(links, (object) => object.name);
