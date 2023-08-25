import * as React from 'react';

export const stopPropagation = {
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
  role: 'button',
  'aria-hidden': true,
};

type OnRowClickProps = {
  fn: (e: React.MouseEvent) => void;
  condition?: boolean;
};

export const onRowClick = ({ fn, condition = true }: OnRowClickProps) => {
  if (condition) {
    return {
      style: { cursor: 'pointer' },
      onClick: fn,
    };
  }
};

// Use createElement to avoid making this file a TSX since it's in the utils folder
export const StopPropagation = () => {
  return React.createElement('div', stopPropagation);
};
