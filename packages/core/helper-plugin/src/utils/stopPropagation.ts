import * as React from 'react';

/**
 * @deprecated Use the onClick prop on the element you want to stop propagation on instead
 */
export const stopPropagation = {
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
  role: 'button',
  'aria-hidden': true,
};

type OnRowClickProps = {
  fn: (e: React.MouseEvent) => void;
  condition?: boolean;
};

/**
 * @deprecated Set the onClick prop directly
 */
export const onRowClick = ({ fn, condition = true }: OnRowClickProps) => {
  if (condition) {
    return {
      style: { cursor: 'pointer' },
      onClick: fn,
    };
  }
};

/**
 *
 * @deprecated Set the onClick prop on the element you want to stop propagation on instead
 */
export const StopPropagation = () => {
  // Use createElement to avoid making this file a TSX since it's in the utils folder
  return React.createElement('div', stopPropagation);
};
