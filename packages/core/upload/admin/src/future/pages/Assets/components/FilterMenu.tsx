import { useState } from 'react';

import { useIsMobile } from '@strapi/admin/strapi-admin';
import { Badge, Box, Checkbox, Flex, Menu } from '@strapi/design-system';
import { Check, ChevronDown, Filter as FilterIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../utils/translations';
import {
  DATE_PRESETS,
  TYPE_VALUES,
  type DateField,
  type DatePreset,
  type ListFilters,
  type TypeValue,
} from '../hooks/useListFilters';

import { DateRangeCalendar } from './DateRangeCalendar';

import type { MessageDescriptor } from 'react-intl';

export const TYPE_LABELS: Record<TypeValue, MessageDescriptor> = {
  folder: { id: getTranslationKey('list.filters.type.folder'), defaultMessage: 'Folder' },
  picture: { id: getTranslationKey('list.filters.type.picture'), defaultMessage: 'Picture' },
  audio: { id: getTranslationKey('list.filters.type.audio'), defaultMessage: 'Audio' },
  video: { id: getTranslationKey('list.filters.type.video'), defaultMessage: 'Video' },
  document: { id: getTranslationKey('list.filters.type.document'), defaultMessage: 'Document' },
};

export const PRESET_LABELS: Record<DatePreset, MessageDescriptor> = {
  '1day': { id: getTranslationKey('list.filters.preset.1day'), defaultMessage: '1 day ago' },
  '3days': { id: getTranslationKey('list.filters.preset.3days'), defaultMessage: '3 days ago' },
  '1week': { id: getTranslationKey('list.filters.preset.1week'), defaultMessage: '1 week ago' },
  '1month': { id: getTranslationKey('list.filters.preset.1month'), defaultMessage: '1 month ago' },
  '3months': {
    id: getTranslationKey('list.filters.preset.3months'),
    defaultMessage: '3 months ago',
  },
  '6months': {
    id: getTranslationKey('list.filters.preset.6months'),
    defaultMessage: '6 months ago',
  },
  '1year': { id: getTranslationKey('list.filters.preset.1year'), defaultMessage: '1 year ago' },
};

export const DATE_FIELD_LABELS: Record<DateField, MessageDescriptor> = {
  createdAt: {
    id: getTranslationKey('list.filters.field.created'),
    defaultMessage: 'Creation date',
  },
  updatedAt: {
    id: getTranslationKey('list.filters.field.updated'),
    defaultMessage: 'Last modified',
  },
};

// The DS SubTrigger renders its chevron inline right after the label — push it
// to the far edge so every field row reads label · · · ›, like the mock.
const FieldSubTrigger = styled(Menu.SubTrigger)`
  width: 100%;
  justify-content: space-between;
`;

/** Every panel of the filter tree shares this fixed width (design). */
export const FILTER_PANEL_WIDTH = '24.2rem';

// dvh, not vh: on a phone `vh` ignores the browser chrome, so a 70vh panel can
// extend past the visual viewport and leave its lower rows (the last field, and
// anything under the date-range calendar) stranded under the URL bar with no way
// to scroll to them. Same reason the drawer caps on dvh.
const PANEL_MAX_HEIGHT = '70dvh';

// Mobile uses one flat panel (accordion), so it never needs room for a side
// flyout — cap it to the viewport so it can't overflow a narrow screen.
const MOBILE_PANEL_WIDTH = `min(${FILTER_PANEL_WIDTH}, calc(100dvw - 2rem))`;

// Mobile accordion: the field row is a plain menu item that expands its options
// inline below it (Radix sub-menus can only fly out sideways, off a phone).
const FieldToggle = styled(Menu.Item)`
  width: 100%;
`;

// Rotates the chevron when its section is open.
const Chevron = styled(ChevronDown)<{ $open: boolean }>`
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

// Sub panels: fixed width, no 15rem clamp (the DS default folds the calendar),
// and a negative top margin cancelling the parent panel's padding + border so
// the sub panel's top edge lines up with the parent panel, not the item.
const SubPanel = styled(Menu.SubContent)`
  margin-top: calc(-1 * (${({ theme }) => theme.spaces[1]} + 1px));
`;

const CountBadge = styled(Badge)`
  height: 1.6rem;
  min-width: auto;
  padding: 0 0.4rem;
`;

interface FilterMenuProps {
  listFilters: ListFilters;
}

/**
 * Toolbar "Filter" dropdown. Picking anything ADDS a badge (editing happens on
 * the badge itself, see FilterBadges):
 *
 * - Type → keep-open checkbox list; the badge is created/updated live with the
 *   checked set (`is` by default, condition editable on the badge).
 * - Creation date / Last modified → preset list (single pick, `within the
 *   last` by default) + "Select date range" (creation date only) opening the
 *   range calendar; a completed range adds an `is` range badge.
 *
 * Closing behaviour follows how many values a field can hold: a date is one
 * value, so picking a preset (or committing a range) closes the menu; Type is a
 * set, so it stays open until dismissed.
 */
export const FilterMenu = ({ listFilters }: FilterMenuProps) => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const { filters, addFilter, updateFilter, removeFilter } = listFilters;

  // The Type submenu edits the LAST type badge in place while the menu stays
  // open (checking values accumulates into one badge, per design).
  let lastTypeIndex = -1;
  for (let i = filters.length - 1; i >= 0; i -= 1) {
    if (filters[i].kind === 'type') {
      lastTypeIndex = i;
      break;
    }
  }
  const lastTypeFilter = lastTypeIndex >= 0 ? filters[lastTypeIndex] : null;
  const checkedValues =
    lastTypeFilter && lastTypeFilter.kind === 'type' ? lastTypeFilter.values : [];

  const toggleTypeValue = (value: TypeValue) => {
    const nextValues = checkedValues.includes(value)
      ? checkedValues.filter((v) => v !== value)
      : [...checkedValues, value];

    if (lastTypeFilter && lastTypeFilter.kind === 'type') {
      if (nextValues.length === 0) {
        // Unchecking the final value removes the badge outright — a type
        // filter with no values is not a state (it would serialize to a
        // malformed `type:is:` the parser drops anyway).
        removeFilter(lastTypeIndex);
      } else {
        updateFilter(lastTypeIndex, { ...lastTypeFilter, values: nextValues });
      }
    } else if (nextValues.length > 0) {
      addFilter({ kind: 'type', condition: 'is', values: nextValues });
    }
  };

  // Creation date / Last modified are single-select (per design): selecting a
  // preset replaces the field's existing preset badge in place (keeping its
  // condition) rather than adding another pill; a badge is created only when the
  // field has none yet.
  const addPreset = (field: DateField, preset: DatePreset) => {
    for (let i = filters.length - 1; i >= 0; i -= 1) {
      const f = filters[i];
      if (f.kind === 'date' && f.mode === 'preset' && f.field === field) {
        updateFilter(i, { ...f, preset });
        return;
      }
    }
    addFilter({ kind: 'date', field, mode: 'preset', condition: 'withinLast', preset });
  };

  const addRange = (from: string, to: string) => {
    addFilter({ kind: 'date', field: 'createdAt', mode: 'range', condition: 'is', from, to });
    // The calendar is not a Menu.Item — close the menu explicitly on commit.
    setIsOpen(false);
  };

  const isMobile = useIsMobile();
  // Mobile accordion state: which field is expanded, and whether its date-range
  // calendar is open. Both reset when the whole menu closes.
  const [openField, setOpenField] = useState<'type' | 'createdAt' | 'updatedAt' | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next);
    if (!next) {
      setOpenField(null);
      setRangeOpen(false);
    }
  };

  const toggleField = (field: 'type' | 'createdAt' | 'updatedAt') => {
    setOpenField((current) => (current === field ? null : field));
    setRangeOpen(false);
  };

  // Option lists, shared by the desktop flyouts and the mobile accordion.
  // Multi-select semantics: menuitemcheckbox + aria-checked carry the state for
  // assistive tech; the Checkbox is purely decorative (aria-hidden, unfocusable)
  // — the Menu.Item is the control.
  const typeItems = TYPE_VALUES.map((value) => (
    <Menu.Item
      key={value}
      role="menuitemcheckbox"
      aria-checked={checkedValues.includes(value)}
      onSelect={(e: Event) => {
        e.preventDefault();
        toggleTypeValue(value);
      }}
      startIcon={<Checkbox checked={checkedValues.includes(value)} tabIndex={-1} aria-hidden />}
    >
      {formatMessage(TYPE_LABELS[value])}
    </Menu.Item>
  ));

  // The field's currently-selected preset (single-select), so the menu can mark
  // it with a check.
  const selectedPresetForField = (field: DateField): DatePreset | null => {
    for (let i = filters.length - 1; i >= 0; i -= 1) {
      const f = filters[i];
      if (f.kind === 'date' && f.mode === 'preset' && f.field === field) {
        return f.preset;
      }
    }
    return null;
  };

  const presetItems = (field: DateField) => {
    const selected = selectedPresetForField(field);

    return DATE_PRESETS.map((preset) => (
      <Menu.Item
        key={preset}
        role="menuitemradio"
        aria-checked={selected === preset}
        onSelect={() => {
          // No preventDefault, unlike Type: a date field holds exactly one
          // value, so the pick is complete and the menu closes on it. Type stays
          // open because the user may still be building up a multi-value set.
          addPreset(field, preset);
        }}
        endIcon={
          selected === preset ? (
            <Check aria-hidden width="1.6rem" height="1.6rem" fill="primary600" />
          ) : null
        }
      >
        {formatMessage(PRESET_LABELS[preset])}
      </Menu.Item>
    ));
  };

  const typeLabel = formatMessage({
    id: getTranslationKey('list.filters.field.type'),
    defaultMessage: 'Type',
  });
  const selectDateRangeLabel = formatMessage({
    id: getTranslationKey('list.filters.select-date-range'),
    defaultMessage: 'Select date range',
  });

  return (
    <Menu.Root open={isOpen} onOpenChange={handleOpenChange}>
      {/* endIcon={null} drops the DS default chevron — the mock has none. */}
      <Menu.Trigger variant="tertiary" startIcon={<FilterIcon aria-hidden />} endIcon={null}>
        <Flex gap={2} alignItems="center" tag="span">
          {formatMessage({
            id: getTranslationKey('list.filters.trigger'),
            defaultMessage: 'Filter',
          })}
          {filters.length > 0 && <CountBadge>{filters.length}</CountBadge>}
        </Flex>
      </Menu.Trigger>
      <Menu.Content
        popoverPlacement="bottom-start"
        zIndex={2}
        maxHeight={PANEL_MAX_HEIGHT}
        width={isMobile ? MOBILE_PANEL_WIDTH : FILTER_PANEL_WIDTH}
      >
        {isMobile ? (
          // Mobile: one flat panel. Each field expands its options inline below
          // itself — Radix sub-menus can only fly out sideways, off a phone.
          <>
            <FieldToggle
              aria-expanded={openField === 'type'}
              onSelect={(e: Event) => {
                e.preventDefault();
                toggleField('type');
              }}
              endIcon={<Chevron $open={openField === 'type'} aria-hidden />}
            >
              {typeLabel}
            </FieldToggle>
            {openField === 'type' && <Box paddingLeft={2}>{typeItems}</Box>}

            {(['createdAt', 'updatedAt'] as const).map((field) => (
              <Box key={field} width="100%">
                <FieldToggle
                  aria-expanded={openField === field}
                  onSelect={(e: Event) => {
                    e.preventDefault();
                    toggleField(field);
                  }}
                  endIcon={<Chevron $open={openField === field} aria-hidden />}
                >
                  {formatMessage(DATE_FIELD_LABELS[field])}
                </FieldToggle>
                {openField === field && (
                  <Box paddingLeft={2}>
                    {presetItems(field)}
                    {/* Only Creation date offers a range from the UI (design). */}
                    {field === 'createdAt' && (
                      <>
                        <FieldToggle
                          aria-expanded={rangeOpen}
                          onSelect={(e: Event) => {
                            e.preventDefault();
                            setRangeOpen((open) => !open);
                          }}
                          endIcon={<Chevron $open={rangeOpen} aria-hidden />}
                        >
                          {selectDateRangeLabel}
                        </FieldToggle>
                        {rangeOpen && (
                          <Box paddingLeft={2}>
                            <DateRangeCalendar onSelect={addRange} />
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
            ))}
          </>
        ) : (
          <>
            <Menu.SubRoot>
              <FieldSubTrigger>{typeLabel}</FieldSubTrigger>
              <SubPanel zIndex={2} maxHeight={PANEL_MAX_HEIGHT} width={FILTER_PANEL_WIDTH}>
                {typeItems}
              </SubPanel>
            </Menu.SubRoot>

            {(['createdAt', 'updatedAt'] as const).map((field) => (
              <Menu.SubRoot key={field}>
                <FieldSubTrigger>{formatMessage(DATE_FIELD_LABELS[field])}</FieldSubTrigger>
                <SubPanel zIndex={2} maxHeight={PANEL_MAX_HEIGHT} width={FILTER_PANEL_WIDTH}>
                  {presetItems(field)}
                  {/* Design constraint: only Creation date offers a range from the
                      UI. The URL codec and the badges support ranges on both date
                      fields (`updated:rangeis:…` works when hand-crafted) so this
                      stays a one-line change if design extends it later. */}
                  {field === 'createdAt' && (
                    <Menu.SubRoot>
                      <FieldSubTrigger>{selectDateRangeLabel}</FieldSubTrigger>
                      <SubPanel zIndex={2} maxHeight="none" width={FILTER_PANEL_WIDTH}>
                        <DateRangeCalendar onSelect={addRange} />
                      </SubPanel>
                    </Menu.SubRoot>
                  )}
                </SubPanel>
              </Menu.SubRoot>
            ))}
          </>
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
