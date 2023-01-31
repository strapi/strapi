import matchSorter from 'match-sorter';
import camelCase from 'lodash/camelCase';

/**
 * @type {(links: array, search? : string) => array }
 */
const matchByTitle = (links, search) =>
  search
    ? matchSorter(links, search.toLowerCase(), { keys: [(item) => item.title.toLowerCase()] })
    : links.sort((link, nextLink) => {
        const title = camelCase(link.title);
        const nextTitle = camelCase(nextLink.title);

        if (title < nextTitle) {
          return -1;
        }
        if (title > nextTitle) {
          return 1;
        }

        return 0;
      });

export default matchByTitle;
