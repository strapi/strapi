import { useState } from 'react';

import { Box, Flex, IconButton, Typography, VisuallyHidden } from '@strapi/design-system';
import { ChevronLeft, ChevronRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../utils/translations';

/**
 * Month-grid range picker: first click sets the start, second click the end
 * (clicks are reordered when the second date is before the first). The DS only
 * ships a single-value DatePicker, so the range grid is built locally.
 *
 * Month/year move via chevrons rather than the mock's dropdowns — nested
 * popovers inside a dropdown menu fight Radix's outside-interaction handling.
 */

const DayCell = styled.button<{ $inRange?: boolean; $isEdge?: boolean; $isMuted?: boolean }>`
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  font: inherit;
  color: ${({ theme, $isEdge, $isMuted }) => {
    if ($isEdge) return theme.colors.primary600;
    if ($isMuted) return theme.colors.neutral400;
    return theme.colors.neutral800;
  }};
  background: ${({ theme, $inRange, $isEdge }) => {
    if ($isEdge) return theme.colors.primary200;
    if ($inRange) return theme.colors.primary100;
    return 'transparent';
  }};

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

const toKey = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const fromKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Monday-first weeks covering the given month, padded with adjacent days. */
const buildWeeks = (year: number, month: number): Date[][] => {
  const first = new Date(year, month, 1);
  const start = new Date(first.getTime());
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));

  const weeks: Date[][] = [];
  const cursor = new Date(start.getTime());

  do {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor.getTime()));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month && cursor.getFullYear() === year);

  return weeks;
};

interface DateRangeCalendarProps {
  /** `YYYY-MM-DD`, both set when editing an existing range badge. */
  from?: string;
  to?: string;
  onSelect: (from: string, to: string) => void;
}

export const DateRangeCalendar = ({ from, to, onSelect }: DateRangeCalendarProps) => {
  const { formatMessage, formatDate } = useIntl();

  const initialMonth = from ? fromKey(from) : new Date();
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());
  // In-progress selection: set on the first click, cleared on commit.
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  const rangeStart = pendingStart ?? from ?? null;
  const rangeEnd = pendingStart ? null : (to ?? null);

  const moveMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleDayClick = (day: Date) => {
    const key = toKey(day);

    if (!pendingStart) {
      setPendingStart(key);
      return;
    }

    const [start, end] = key < pendingStart ? [key, pendingStart] : [pendingStart, key];
    setPendingStart(null);
    onSelect(start, end);
  };

  const weeks = buildWeeks(viewYear, viewMonth);
  const weekDayLabels = weeks[0].map((day) => formatDate(day, { weekday: 'short' }).slice(0, 2));

  return (
    // role="group" (not "application"): these are plain buttons — hijacking
    // the screen reader's own key handling would take away navigation and
    // give nothing back.
    <Box
      padding={2}
      width="100%"
      role="group"
      aria-label={formatMessage({
        id: getTranslationKey('list.filters.calendar.label'),
        defaultMessage: 'Select date range',
      })}
      data-testid="date-range-calendar"
    >
      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
        <IconButton
          variant="ghost"
          label={formatMessage({
            id: getTranslationKey('list.filters.calendar.previous-month'),
            defaultMessage: 'Previous month',
          })}
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft />
        </IconButton>
        <Typography fontWeight="semiBold" textColor="neutral800">
          {formatDate(new Date(viewYear, viewMonth, 1), { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton
          variant="ghost"
          label={formatMessage({
            id: getTranslationKey('list.filters.calendar.next-month'),
            defaultMessage: 'Next month',
          })}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight />
        </IconButton>
      </Flex>

      <Flex>
        {weekDayLabels.map((label, index) => (
          <Flex key={index} width="3rem" height="2.4rem" justifyContent="center">
            <Typography variant="pi" fontWeight="semiBold" textColor="neutral600">
              {label}
            </Typography>
          </Flex>
        ))}
      </Flex>

      {weeks.map((week, weekIndex) => (
        <Flex key={weekIndex}>
          {week.map((day) => {
            const key = toKey(day);
            const isEdge = key === rangeStart || key === rangeEnd;
            const inRange =
              rangeStart !== null && rangeEnd !== null && key > rangeStart && key < rangeEnd;

            return (
              <DayCell
                key={key}
                type="button"
                $isEdge={isEdge}
                $inRange={inRange}
                $isMuted={day.getMonth() !== viewMonth}
                onClick={() => handleDayClick(day)}
              >
                <VisuallyHidden>{formatDate(day, { dateStyle: 'long' })}</VisuallyHidden>
                <span aria-hidden>{day.getDate()}</span>
              </DayCell>
            );
          })}
        </Flex>
      ))}
    </Box>
  );
};
