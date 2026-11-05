import * as React from 'react';

import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { cn } from '@strapi/design-system/next';
import { Download, Upload } from '@strapi/icons';
import { useIntl } from 'react-intl';

import type { ReleaseAction } from '../../../shared/contracts/release-actions';

/**
 * Per-entry release action selector (publish / unpublish), as a segmented control.
 *
 * Local `/next`-style component on @base-ui RadioGroup + Tailwind, mirroring the `SegmentedControl`
 * proposed for the design system (strapi/design-system#2083). Swap this for
 * `import { SegmentedControl, SegmentedControlItem } from '@strapi/design-system/next'` once that PR
 * merges and publishes.
 *
 * Radio, not toggle: exactly one option is always selected and it never clears to empty. The icon +
 * label carry the meaning, so neither option is tinted with an action colour (an earlier version
 * painted unpublish danger-red, which read as a warning for a perfectly normal choice).
 */

type ActionType = ReleaseAction['type'];

interface ActionOptionProps {
  selected: ActionType;
  onChange: (type: ActionType) => void;
  name: string;
  disabled?: boolean;
}

const itemClassName = cn(
  'inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-medium whitespace-nowrap',
  'text-muted-foreground outline-none transition-colors select-none',
  'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
  'data-[checked]:cursor-default data-[checked]:bg-background data-[checked]:text-foreground data-[checked]:shadow-xs',
  // A read-only user still sees the current action at full contrast: only the other one dims
  'data-[disabled]:pointer-events-none data-[unchecked]:data-[disabled]:opacity-50',
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
);

export const ReleaseActionOptions = ({
  selected,
  onChange,
  name,
  disabled = false,
}: ActionOptionProps) => {
  const { formatMessage } = useIntl();

  const handleValueChange = (next: ActionType) => {
    // Radio semantics: clicking the selected item keeps it, so only react to a real change
    if (next !== selected) {
      onChange(next);
    }
  };

  const getLabel = (type: ActionType) =>
    formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.table.action-type',
        defaultMessage: '{isPublish, select, true {Publish} other {Unpublish}}',
      },
      { isPublish: type === 'publish' }
    );

  return (
    <RadioGroup<ActionType>
      name={name}
      value={selected}
      onValueChange={handleValueChange}
      disabled={disabled}
      aria-label={formatMessage({
        id: 'content-releases.page.ReleaseDetails.table.header.label.action',
        defaultMessage: 'action',
      })}
      className="inline-flex w-fit items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
    >
      <Radio.Root value="publish" className={itemClassName}>
        <Upload aria-hidden />
        {getLabel('publish')}
      </Radio.Root>
      <Radio.Root value="unpublish" className={itemClassName}>
        <Download aria-hidden />
        {getLabel('unpublish')}
      </Radio.Root>
    </RadioGroup>
  );
};
