// TODO add new translations as needed
// TODO correct sortability implementation ??
import { getTrad } from '../../../utils';

export const TABLE_HEADERS = [
  {
    name: 'name',
    label: { id: getTrad('list.table.header.name'), defaultMessage: 'name' },
    isSortable: true,
  },
  {
    name: 'createdAt',
    label: { id: 'TODO', defaultMessage: 'creation date' },
    isSortable: true,
  },
  {
    name: 'updatedAt',
    label: { id: 'TODO', defaultMessage: 'last modified' },
    isSortable: false,
  },
  {
    name: 'size',
    label: { id: getTrad('list.table.header.size'), defaultMessage: 'size' },
    isSortable: false,
  },
  {
    name: 'actions',
    label: { id: getTrad('list.table.header.actions'), defaultMessage: 'actions' },
    isSortable: false,
    isVisuallyHidden: true,
  },
] as const;
