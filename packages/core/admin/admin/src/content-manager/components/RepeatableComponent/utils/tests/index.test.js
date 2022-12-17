import React, { useRef } from 'react';
import { darkTheme } from '@strapi/design-system';
import styled, { ThemeProvider } from 'styled-components';
import Drag from '@strapi/icons/Drag';
import { render } from '@testing-library/react';

const DragButton = styled.span`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.spaces[7]};
  background-color: transparent;
  padding: 0 ${({ theme }) => theme.spaces[3]};
  cursor: all-scroll;

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
    path {
      fill: ${({ theme, expanded }) =>
        expanded ? theme.colors.primary600 : theme.colors.neutral600};
    }
  }
  &:hover {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.primary600};
      }
    }
  }
`;

const RenderDragButton = () => {
  const dragRef = useRef(null);
  const refs = { dragRef };

  return (
    <ThemeProvider theme={darkTheme}>
      <DragButton
        role="button"
        tabIndex={-1}
        ref={refs.dragRef}
        onClick={(e) => e.stopPropagation()}
      >
        <Drag />
      </DragButton>
    </ThemeProvider>
  );
};

describe('dragIconRendersCorrectly', () => {
  it('renders and matches snapshot', async () => {
    const { container } = render(<RenderDragButton />);
    expect(container).toMatchSnapshot();
  });
});
