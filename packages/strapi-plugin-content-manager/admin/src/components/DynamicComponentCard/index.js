import React from 'react';
import PropTypes from 'prop-types';
import Wrapper from './Wrapper';

const DynamicComponentCard = ({ children, componentUid, icon, onClick }) => {
  return (
    <Wrapper
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        onClick(componentUid);
      }}
    >
      <button className="component-icon">
        <i className={`fa fa-${icon}`} />
      </button>

      <div className="component-uid">
        <span>{componentUid}</span>
      </div>
      {children}
    </Wrapper>
  );
};

DynamicComponentCard.defaultProps = {
  children: null,
  onClick: () => {},
  icon: 'smile',
};

DynamicComponentCard.propTypes = {
  children: PropTypes.node,
  componentUid: PropTypes.string.isRequired,
  icon: PropTypes.string,
  onClick: PropTypes.func,
};

export default DynamicComponentCard;
