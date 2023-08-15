import React from 'react';

export const stopPropagation = {
  onClick: (e) => e.stopPropagation(),
  role: 'button',
  'aria-hidden': true,
};

export const onRowClick = ({ fn, condition = true }) => {
  if (condition) {
    return {
      style: { cursor: 'pointer' },
      onClick: fn,
    };
  }
};

export const StopPropagation = () => <div {...stopPropagation} />;
