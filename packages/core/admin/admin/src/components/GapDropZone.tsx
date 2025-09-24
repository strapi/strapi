import { styled } from 'styled-components';
import { useDrop } from 'react-dnd';

import { ResizeHandleContainer } from './ResizeIndicator';

export interface GapDropZoneProps {
  insertIndex: number;
  position: { left: number; top: number; height: number; width: number };
  isVisible: boolean;
  type: 'vertical' | 'horizontal';
  moveWidget: (id: string, to: number, targetRowIndex?: number, isHorizontalDrop?: boolean) => void;
  targetRowIndex?: number;
}

const GapDropZoneContainer = styled(ResizeHandleContainer)<{
  $isOver: boolean;
}>`
  background-color: ${({ $isOver }) => ($isOver ? 'rgba(0, 123, 255, 0.2)' : 'transparent')};
  border: ${({ $isOver, theme }) =>
    $isOver ? `2px solid ${theme.colors.primary500}` : '2px solid transparent'};
  opacity: ${({ $isOver }) => ($isOver ? 1 : 0.6)};
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const GapDropZone = ({
  insertIndex,
  position,
  isVisible,
  type,
  moveWidget,
  targetRowIndex,
}: GapDropZoneProps) => {
  const isHorizontalDrop = type === 'horizontal';

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'widget',
      drop: (item: { id: string }) => {
        moveWidget(item.id, insertIndex, targetRowIndex, isHorizontalDrop);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [insertIndex, isHorizontalDrop, moveWidget, targetRowIndex]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <GapDropZoneContainer
      ref={drop}
      $isOver={isOver}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        height: `${position.height}px`,
        width: `${position.width}px`,
      }}
    />
  );
};
