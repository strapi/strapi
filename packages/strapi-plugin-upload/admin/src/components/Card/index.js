import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import PropTypes from 'prop-types';
import { formatBytes, getExtension, getType, ItemTypes } from '../../utils';

import Flex from '../Flex';
import Text from '../Text';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import Tag from '../Tag';
import Wrapper from './Wrapper';
import Title from './Title';
import ErrorMessage from './ErrorMessage';
import Border from './Border';

const Card = ({
  id,
  checked,
  children,
  errorMessage,
  hasError,
  index,
  isDraggable,
  mime,
  moveAsset,
  name,
  onClick,
  small,
  size,
  type,
  url,
  withFileCaching,
}) => {
  const ref = useRef(null);
  const [, drop] = useDrop({
    accept: ItemTypes.MEDIA_CARD,
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      // Time to actually perform the action
      moveAsset(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });
  const [{ isDragging }, drag] = useDrag({
    item: { type: ItemTypes.MEDIA_CARD, id, index },
    canDrag: () => isDraggable,
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });
  const opacity = isDragging ? 0.2 : 1;
  drag(drop(ref));

  const fileSize = formatBytes(size, 0);
  const fileType = mime || type;

  const handleClick = () => {
    onClick(id);
  };

  return (
    <Wrapper onClick={handleClick} isDraggable={isDraggable} ref={ref} style={{ opacity }}>
      <CardImgWrapper checked={checked} small={small}>
        <CardPreview
          hasError={hasError}
          url={url}
          type={fileType}
          withFileCaching={withFileCaching}
        />
        <Border color={hasError ? 'orange' : 'mediumBlue'} shown={checked || hasError} />
        {children}
      </CardImgWrapper>
      <Flex>
        <Title>{name}</Title>
        <Tag label={getType(fileType)} />
      </Flex>
      <Text color="grey" fontSize="xs" ellipsis>
        {`${getExtension(fileType)} - ${fileSize}`}
      </Text>
      {hasError && <ErrorMessage>{errorMessage}</ErrorMessage>}
    </Wrapper>
  );
};

Card.defaultProps = {
  checked: false,
  children: null,
  errorMessage: null,
  id: null,
  index: 0,
  isDraggable: false,
  hasError: false,
  mime: null,
  moveAsset: () => {},
  name: null,
  onClick: () => {},
  size: 0,
  small: false,
  type: null,
  url: null,
  withFileCaching: true,
};

Card.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  checked: PropTypes.bool,
  children: PropTypes.node,
  errorMessage: PropTypes.string,
  hasError: PropTypes.bool,
  index: PropTypes.number,
  isDraggable: PropTypes.bool,
  mime: PropTypes.string,
  moveAsset: PropTypes.func,
  name: PropTypes.string,
  onClick: PropTypes.func,
  size: PropTypes.number,
  small: PropTypes.bool,
  type: PropTypes.string,
  url: PropTypes.string,
  withFileCaching: PropTypes.bool,
};

export default Card;
