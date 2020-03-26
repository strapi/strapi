import React, { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import PropTypes from 'prop-types';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { formatBytes, getExtension, getType, ItemTypes } from '../../utils';

import Flex from '../Flex';
import Text from '../Text';
import Border from '../CardBorder';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import ErrorMessage from '../CardErrorMessage';
import Title from '../CardTitle';
import Tag from '../Tag';
import Wrapper from '../CardWrapper';

const DraggableCard = ({
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
    hover(item) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Directly move the asset for faster reorder
      // It doing so makes lot of computations though
      moveAsset(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const fileSize = formatBytes(size, 0);
  const fileType = mime || type;

  const [{ isDragging }, drag, preview] = useDrag({
    item: { type: ItemTypes.MEDIA_CARD, id, index, checked, url, fileType },
    canDrag: () => isDraggable,
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Remove the default preview when the item is being dragged
  // The preview is handled by the DragLayer
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const opacity = isDragging ? 0.2 : 1;

  const handleClick = () => {
    onClick(id);
  };

  drag(drop(ref));

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

DraggableCard.defaultProps = {
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

DraggableCard.propTypes = {
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

export default DraggableCard;
