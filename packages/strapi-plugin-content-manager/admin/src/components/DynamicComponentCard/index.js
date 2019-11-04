import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import Wrapper from './Wrapper';

const DynamicComponentCard = ({
  children,
  componentUid,
  isOver,
  onClick,
  onMouseEvent,
  tradId,
}) => {
  return (
    <Wrapper
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        onClick(componentUid);
      }}
      onMouseEnter={onMouseEvent}
      onMouseLeave={onMouseEvent}
    >
      <div className="component-icon">
        <i className="fa fa-picture-o" />
      </div>

      <div className="component-uid">
        {isOver ? (
          <FormattedMessage id={`${pluginId}.${tradId}`} />
        ) : (
          <span>{componentUid}</span>
        )}
      </div>
      {children}
    </Wrapper>
  );
};

DynamicComponentCard.defaultProps = {
  children: null,
  isOver: false,
  onClick: () => {},
  onMouseEvent: () => {},
  tradId: 'components.DraggableAttr.edit',
};

DynamicComponentCard.propTypes = {
  children: PropTypes.node,
  componentUid: PropTypes.string.isRequired,
  isOver: PropTypes.bool,
  onClick: PropTypes.func,
  onMouseEvent: PropTypes.func,
  tradId: PropTypes.string,
};

export default DynamicComponentCard;
