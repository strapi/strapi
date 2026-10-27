import type { Filters } from '../../components/Filters';
import type { MessageDescriptor } from 'react-intl';

/* -------------------------------------------------------------------------------------------------
 * List extensions
 * -----------------------------------------------------------------------------------------------*/

type ExtensibleList = 'api-tokens' | 'admin-tokens' | 'media-library' | 'audit-logs';

interface ListExtension {
  /**
   * `field` is a dot path in the row, for example `space.name`. An empty value shows `-`
   */
  column?: { label: MessageDescriptor; field: string };
  /**
   * The list sends its value to the server in the list query, under `filters`
   */
  filter?: Filters.Filter;
}

/**
 * May call hooks. Return `null` to add nothing, for example where the column does not apply
 */
type UseListExtension = () => ListExtension | null;

const listExtensions: Record<ExtensibleList, UseListExtension[]> = {
  'api-tokens': [],
  'admin-tokens': [],
  'media-library': [],
  'audit-logs': [],
};

const registerListExtension = (list: ExtensibleList, useExtension: UseListExtension) => {
  listExtensions[list].push(useExtension);
};

const useListExtensions = (list: ExtensibleList) => {
  // Each extension may call hooks. The registry is fixed once plugins have bootstrapped, so they
  // run in the same order on every render
  const extensions = listExtensions[list]
    .map((extension) => extension())
    .filter((extension): extension is ListExtension => extension !== null);

  return {
    columns: extensions.flatMap(({ column }) => (column ? [column] : [])),
    filters: extensions.flatMap(({ filter }) => (filter ? [filter] : [])),
  };
};

export { registerListExtension, useListExtensions };
export type { ListExtension };
