import { traverse } from '@strapi/utils';
import { Options, Data } from './types';
import { switchDocumentIdForId } from './utils';

type Sort = Data | string;

const rootIdReplacement = (sort: Sort) => {
  if (typeof sort === 'object') {
    return switchDocumentIdForId(sort);
  }

  if (typeof sort === 'string') {
    let sortCopy = sort;
    let suffix = '';
    const match = sort.match(/:(\w+)$/);
    if (match) {
      suffix = match[0];

      // TODO is there a regex to match :ASC or :DESC?
      sortCopy = sort.replace(suffix, '');
    }

    if (sortCopy === 'id') {
      sortCopy = 'documentId';
    } else {
      sortCopy = sortCopy
        .split(',')
        .map((value: any) => (value === 'id' ? 'documentId' : value))
        .join(',');
    }

    return sortCopy + suffix;
  }

  return sort;
};

export const transformSort = async (sort: Sort | Sort[], opts: Options) => {
  let mappedSort;

  // Replace any top level 'id' properties with 'documentId'
  if (Array.isArray(sort)) {
    mappedSort = sort.map(rootIdReplacement);
  } else {
    mappedSort = rootIdReplacement(sort);
  }

  return traverse.traverseQuerySort(
    ({ attribute, value, key }, { set }) => {
      if (attribute?.type === 'relation') {
        // Replace any relation 'id' properties with 'documentId'
        set(key, rootIdReplacement(value as any));
      }
    },
    { schema: strapi.getModel(opts.uid) },
    mappedSort
  );
};
