import { Menu } from '@strapi/design-system';
import { Check, ChevronDown } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../utils/translations';
import {
  type FoldersPosition,
  type ListSort,
  type SortByKey,
  type SortDirectionKey,
} from '../hooks/useListSort';

import type { MessageDescriptor } from 'react-intl';

const SORT_BY_LABELS: Record<SortByKey, MessageDescriptor> = {
  oldestUploads: {
    id: getTranslationKey('list.sort.oldest-uploads'),
    defaultMessage: 'Oldest uploads',
  },
  mostRecentUpdates: {
    id: getTranslationKey('list.sort.most-recent-updates'),
    defaultMessage: 'Most recent updates',
  },
};

const SORT_DIRECTION_LABELS: Record<SortDirectionKey, MessageDescriptor> = {
  nameAsc: { id: getTranslationKey('list.sort.name-asc'), defaultMessage: 'A to Z' },
  nameDesc: { id: getTranslationKey('list.sort.name-desc'), defaultMessage: 'Z to A' },
  sizeAsc: {
    id: getTranslationKey('list.sort.size-asc'),
    defaultMessage: 'File size ascending',
  },
  sizeDesc: {
    id: getTranslationKey('list.sort.size-desc'),
    defaultMessage: 'File size descending',
  },
};

const FOLDERS_LABELS: Record<FoldersPosition, MessageDescriptor> = {
  top: { id: getTranslationKey('list.sort.folders-on-top'), defaultMessage: 'On top' },
  mixed: {
    id: getTranslationKey('list.sort.folders-mixed'),
    defaultMessage: 'Mixed with files',
  },
};

// Stretch to the toolbar row height so the trigger matches the view toggle
// (the parent Flex uses alignItems="stretch").
const SortTrigger = styled(Menu.Trigger)``;

// Full-width section band, like the design mock (sits inside the Menu.Content
// padding, so the band stops short of the panel edges).
const GroupLabel = styled(Menu.Label)`
  width: 100%;
  display: block;
  background: ${({ theme }) =>
    theme.colorScheme === 'dark' ? theme.colors.neutral150 : theme.colors.neutral100};
  padding-inline: ${({ theme }) => theme.spaces[3]};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

interface SortMenuProps {
  sort: ListSort;
  /**
   * The grid view forces folders on top (mixing folder cards with asset cards
   * is not supported there), so it hides the Folders group entirely.
   */
  showFoldersGroup?: boolean;
}

/**
 * Toolbar "Sort" dropdown: single-select sections (Sort / Folders). Picking an
 * option keeps the menu open (`onSelect` preventDefault) so several facets can
 * be tuned in one visit; clicking a checked facet clears it (the hook
 * guarantees at least one sort rule stays active).
 *
 * Each section is single-select, so its items are radios: the checkmark icon is
 * decorative, and `aria-checked` is what assistive tech reads. The DS `Menu`
 * exposes no `RadioItem`, but `Menu.Item` forwards extra props onto the element
 * it renders through Radix's `asChild`, where they take precedence over Radix's
 * own `role="menuitem"`.
 */
export const SortMenu = ({ sort, showFoldersGroup = true }: SortMenuProps) => {
  const { formatMessage } = useIntl();

  const triggerLabel = formatMessage(
    { id: getTranslationKey('list.sort.trigger'), defaultMessage: 'Sort: {active}' },
    {
      active: sort.sortBy
        ? formatMessage(SORT_BY_LABELS[sort.sortBy])
        : formatMessage(SORT_DIRECTION_LABELS[sort.direction!]),
    }
  );

  const checkmark = <Check aria-hidden width="1.6rem" height="1.6rem" fill="primary600" />;

  return (
    <Menu.Root>
      <SortTrigger variant="ghost" endIcon={<ChevronDown aria-hidden />}>
        {triggerLabel}
      </SortTrigger>
      {/* The DS default maxHeight (15rem) folds everything after the first
          group behind an invisible scroll — all groups must be visible at
          once. 70vh keeps a scroll on very short viewports. */}
      <Menu.Content popoverPlacement="bottom-end" zIndex={2} maxHeight="70vh" minWidth="25rem">
        {/* One single-select "Sort" section: the two rule families were always
            mutually exclusive (one checkmark total), so they share a group. */}
        <GroupLabel>
          {formatMessage({ id: getTranslationKey('list.sort.section'), defaultMessage: 'Sort' })}
        </GroupLabel>
        {(Object.keys(SORT_BY_LABELS) as SortByKey[]).map((key) => (
          <Menu.Item
            key={key}
            role="menuitemradio"
            aria-checked={sort.sortBy === key}
            onSelect={(e: Event) => {
              e.preventDefault();
              sort.setSortBy(sort.sortBy === key ? null : key);
            }}
            endIcon={sort.sortBy === key ? checkmark : null}
          >
            {formatMessage(SORT_BY_LABELS[key])}
          </Menu.Item>
        ))}
        {(Object.keys(SORT_DIRECTION_LABELS) as SortDirectionKey[]).map((key) => (
          <Menu.Item
            key={key}
            role="menuitemradio"
            aria-checked={sort.direction === key}
            onSelect={(e: Event) => {
              e.preventDefault();
              sort.setDirection(sort.direction === key ? null : key);
            }}
            endIcon={sort.direction === key ? checkmark : null}
          >
            {formatMessage(SORT_DIRECTION_LABELS[key])}
          </Menu.Item>
        ))}

        {showFoldersGroup && (
          <>
            <Menu.Separator />
            <GroupLabel>
              {formatMessage({
                id: getTranslationKey('list.sort.folders'),
                defaultMessage: 'Folders',
              })}
            </GroupLabel>
            {(Object.keys(FOLDERS_LABELS) as FoldersPosition[]).map((position) => (
              <Menu.Item
                key={position}
                role="menuitemradio"
                aria-checked={sort.foldersPosition === position}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  sort.setFoldersPosition(position);
                }}
                endIcon={sort.foldersPosition === position ? checkmark : null}
              >
                {formatMessage(FOLDERS_LABELS[position])}
              </Menu.Item>
            ))}
          </>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
