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
    defaultMessage: 'File size increasingly',
  },
  sizeDesc: {
    id: getTranslationKey('list.sort.size-desc'),
    defaultMessage: 'File size decreasingly',
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
const SortTrigger = styled(Menu.Trigger)`
  height: auto;
`;

// Full-width section band, like the design mock. The negative inline margin
// cancels the Menu.Content padding so the background runs edge to edge.
const GroupLabel = styled(Menu.Label)`
  display: block;
  background: ${({ theme }) => theme.colors.neutral100};
  margin-inline: calc(-1 * ${({ theme }) => theme.spaces[1]});
  padding-inline: ${({ theme }) => theme.spaces[3]};
`;

interface SortMenuProps {
  sort: ListSort;
}

/**
 * Toolbar "Sort" dropdown: three single-select groups (Sort by / Sort direction /
 * Folders). Picking an option keeps the menu open (`onSelect` preventDefault) so
 * several facets can be tuned in one visit; clicking a checked facet clears it
 * (the hook guarantees at least one sort rule stays active).
 */
export const SortMenu = ({ sort }: SortMenuProps) => {
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
      <SortTrigger variant="tertiary" endIcon={<ChevronDown aria-hidden />}>
        {triggerLabel}
      </SortTrigger>
      {/* The DS default maxHeight (15rem) folds everything after the first
          group behind an invisible scroll — the three groups must be visible
          at once. 70vh keeps a scroll on very short viewports. */}
      <Menu.Content popoverPlacement="bottom-end" zIndex={2} maxHeight="70vh" width="25rem">
        <GroupLabel>
          {formatMessage({ id: getTranslationKey('list.sort.by'), defaultMessage: 'Sort by' })}
        </GroupLabel>
        {(Object.keys(SORT_BY_LABELS) as SortByKey[]).map((key) => (
          <Menu.Item
            key={key}
            onSelect={(e: Event) => {
              e.preventDefault();
              sort.setSortBy(sort.sortBy === key ? null : key);
            }}
            endIcon={sort.sortBy === key ? checkmark : null}
          >
            {formatMessage(SORT_BY_LABELS[key])}
          </Menu.Item>
        ))}

        <Menu.Separator />
        <GroupLabel>
          {formatMessage({
            id: getTranslationKey('list.sort.direction'),
            defaultMessage: 'Sort direction',
          })}
        </GroupLabel>
        {(Object.keys(SORT_DIRECTION_LABELS) as SortDirectionKey[]).map((key) => (
          <Menu.Item
            key={key}
            onSelect={(e: Event) => {
              e.preventDefault();
              sort.setDirection(sort.direction === key ? null : key);
            }}
            endIcon={sort.direction === key ? checkmark : null}
          >
            {formatMessage(SORT_DIRECTION_LABELS[key])}
          </Menu.Item>
        ))}

        <Menu.Separator />
        <GroupLabel>
          {formatMessage({ id: getTranslationKey('list.sort.folders'), defaultMessage: 'Folders' })}
        </GroupLabel>
        {(Object.keys(FOLDERS_LABELS) as FoldersPosition[]).map((position) => (
          <Menu.Item
            key={position}
            onSelect={(e: Event) => {
              e.preventDefault();
              sort.setFoldersPosition(position);
            }}
            endIcon={sort.foldersPosition === position ? checkmark : null}
          >
            {formatMessage(FOLDERS_LABELS[position])}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};
