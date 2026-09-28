import { getTranslationKey } from '../../utils/translations';

export const localStorageKeys = {
  view: `STRAPI_UPLOAD_LIBRARY_VIEW`,
};

export const viewOptions = {
  GRID: 0,
  TABLE: 1,
};

const ASSET_DETAILS_TRIGGER_ATTRIBUTE = 'data-asset-details-trigger';

/**
 * Spread onto grid cards and table rows, whose click opens or switches the
 * asset details drawer. The drawer's outside-click dismissal skips presses
 * landing on one of these, so switching assets doesn't close-then-reopen it.
 */
export const ASSET_DETAILS_TRIGGER_PROPS = { [ASSET_DETAILS_TRIGGER_ATTRIBUTE]: '' };

const ASSET_ITEM_CONTROL_ATTRIBUTE = 'data-asset-item-control';

/**
 * Spread onto the controls inside an asset card or row that act on the item
 * rather than opening it — its selection checkbox and its actions menu. They
 * stop the card's own click, so no details switch follows them.
 */
export const ASSET_ITEM_CONTROL_PROPS = { [ASSET_ITEM_CONTROL_ATTRIBUTE]: '' };

/** Matches an element carrying {@link ASSET_ITEM_CONTROL_PROPS}. */
export const ASSET_ITEM_CONTROL_SELECTOR = `[${ASSET_ITEM_CONTROL_ATTRIBUTE}]`;

/** Matches an element carrying {@link ASSET_DETAILS_TRIGGER_PROPS}. */
export const ASSET_DETAILS_TRIGGER_SELECTOR = `[${ASSET_DETAILS_TRIGGER_ATTRIBUTE}]`;

interface TableHeader {
  name: string;
  label: { id: string; defaultMessage: string };
  isVisuallyHidden?: boolean;
}

export const TABLE_HEADERS: TableHeader[] = [
  {
    name: 'name',
    label: { id: getTranslationKey('list.table.header.name'), defaultMessage: 'name' },
  },
  {
    name: 'createdAt',
    label: {
      id: getTranslationKey('list.table.header.creationDate'),
      defaultMessage: 'creation date',
    },
  },
  {
    name: 'updatedAt',
    label: {
      id: getTranslationKey('list.table.header.lastModified'),
      defaultMessage: 'last modified',
    },
  },
  {
    name: 'size',
    label: { id: getTranslationKey('list.table.header.size'), defaultMessage: 'size' },
  },
  {
    name: 'actions',
    label: { id: getTranslationKey('list.table.header.actions'), defaultMessage: 'actions' },
    isVisuallyHidden: true,
  },
];
