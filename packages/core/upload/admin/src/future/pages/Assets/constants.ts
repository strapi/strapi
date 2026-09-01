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

/** Matches an element carrying {@link ASSET_DETAILS_TRIGGER_PROPS}. */
export const ASSET_DETAILS_TRIGGER_SELECTOR = `[${ASSET_DETAILS_TRIGGER_ATTRIBUTE}]`;

/**
 * Controls whose press must not dismiss the asset details drawer — the user is
 * operating the list, not leaving it.
 *
 * Roles as well as tags: the design system's checkbox is a Radix button with
 * `role="checkbox"`, and `menuitem`/`option` cover the sort and filter menus,
 * which portal out of the page and so count as outside the panel.
 */
export const INTERACTIVE_ELEMENT_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="tab"]',
  '[contenteditable="true"]',
].join(', ');

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
