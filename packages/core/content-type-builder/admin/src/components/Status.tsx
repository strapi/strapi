import { Typography } from '@strapi/design-system';

import { Pill } from './Pill';

export const Status = ({ status }: { status: string }) => {
  switch (status) {
    case 'UNCHANGED':
      return null;
    case 'CHANGED':
      return (
        <Typography fontWeight="semiBold" textColor="alternative500">
          M
        </Typography>
      );
    case 'REMOVED':
      return (
        <Typography fontWeight="semiBold" textColor="danger500">
          D
        </Typography>
      );
    case 'NEW':
      return (
        <Typography fontWeight="semiBold" textColor="success500">
          N
        </Typography>
      );
  }
};

const TONES = {
  CHANGED: { tone: 'alternative', label: 'Modified' },
  REMOVED: { tone: 'danger', label: 'Deleted' },
  NEW: { tone: 'success', label: 'New' },
} as const;

/**
 * What has happened to a schema or a field since the last save, in the same
 * rounded shape as the flags it sits beside.
 */
export const StatusBadge = ({ status }: { status: string }) => {
  const entry = TONES[status as keyof typeof TONES];

  // Nothing to hold a place for: the badge sits inline beside a name, not in
  // a column of its own.
  if (!entry) {
    return null;
  }

  return (
    <Pill tag="span" alignItems="center" $tone={entry.tone}>
      <Typography variant="sigma" textColor={`${entry.tone}600`}>
        {entry.label}
      </Typography>
    </Pill>
  );
};
