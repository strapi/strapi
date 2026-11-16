import { cn } from '@strapi/design-system/next';
import { Download, Upload } from '@strapi/icons';
import { useIntl } from 'react-intl';

import type { ReleaseAction } from '../../../shared/contracts/release-actions';

/**
 * Per-entry release action selector (publish / unpublish), as a segmented control.
 *
 * Native radios styled like the `SegmentedControl` proposed for the design system
 * (strapi/design-system#2083). Swap this for
 * `import { SegmentedControl, SegmentedControlItem } from '@strapi/design-system/next'` once that PR
 * merges and publishes.
 *
 * Radio, not toggle: exactly one option is always selected and it never clears to empty. The icon +
 * label carry the meaning, so neither option is tinted with an action colour (an earlier version
 * painted unpublish danger-red, which read as a warning for a perfectly normal choice).
 */

type ActionType = ReleaseAction['type'];

const ACTION_TYPES = [
  { type: 'publish', Icon: Upload },
  { type: 'unpublish', Icon: Download },
] as const;

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

interface ActionOptionProps {
  selected: ActionType;
  onChange: (type: ActionType) => void;
  name: string;
  disabled?: boolean;
}

const optionClassName = cn(
  'inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-medium whitespace-nowrap',
  'text-muted-foreground transition-colors select-none',
  'hover:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
  'has-[:checked]:cursor-default has-[:checked]:bg-background has-[:checked]:text-foreground has-[:checked]:shadow-xs',
  // A read-only user still sees the current action at full contrast: only the other one dims
  'has-[:disabled]:pointer-events-none has-[:disabled:not(:checked)]:opacity-50',
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
);

export const ReleaseActionOptions = ({
  selected,
  onChange,
  name,
  disabled = false,
}: ActionOptionProps) => {
  const { formatMessage } = useIntl();

  return (
    <div
      role="radiogroup"
      aria-label={formatMessage({
        id: 'content-releases.page.ReleaseDetails.table.header.label.action',
        defaultMessage: 'action',
      })}
      className="inline-flex w-fit items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
      // The details table moves its focus with the arrow keys and cancels them, which would stop
      // the browser moving the radios' selection
      onKeyDown={(event) => {
        if (ARROW_KEYS.has(event.key)) {
          event.stopPropagation();
        }
      }}
    >
      {ACTION_TYPES.map(({ type, Icon }) => (
        <label key={type} className={optionClassName}>
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={type}
            checked={selected === type}
            onChange={() => onChange(type)}
            disabled={disabled}
          />
          <Icon aria-hidden />
          {formatMessage(
            {
              id: 'content-releases.pages.ReleaseDetails.table.action-type',
              defaultMessage: '{isPublish, select, true {Publish} other {Unpublish}}',
            },
            { isPublish: type === 'publish' }
          )}
        </label>
      ))}
    </div>
  );
};
