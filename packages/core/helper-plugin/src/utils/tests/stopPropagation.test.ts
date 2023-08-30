import * as React from 'react';

import { screen, render } from '@testing-library/react';

import { stopPropagation, onRowClick, StopPropagation } from '../stopPropagation';

describe('stopPropagation', () => {
  it('should stop propagation when clicked', () => {
    const eventMock = { stopPropagation: jest.fn() };
    stopPropagation.onClick(eventMock as unknown as React.MouseEvent);
    expect(eventMock.stopPropagation).toHaveBeenCalledTimes(1);
  });

  describe('onRowClick', () => {
    it('should return onClick property when condition is true', () => {
      const onClickMock = jest.fn();
      const props = { fn: onClickMock };
      const result = onRowClick(props);
      expect(result).toEqual({ style: { cursor: 'pointer' }, onClick: onClickMock });
    });

    it('should return undefined when condition is false', () => {
      const onClickMock = jest.fn();
      const props = { fn: onClickMock, condition: false };
      const result = onRowClick(props);
      expect(result).toBeUndefined();
    });
  });

  describe('StopPropagation component', () => {
    it('should render a div with stopPropagation properties', () => {
      render(React.createElement(StopPropagation));
      const divElement = screen.getByRole('button', { hidden: true });
      expect(divElement).toBeInTheDocument();
      expect(divElement).toHaveAttribute('role', 'button');
      expect(divElement).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
