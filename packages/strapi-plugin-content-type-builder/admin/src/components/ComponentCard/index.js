/**
 *
 * ComponentCard
 *
 */

import React from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import useDataManager from '../../hooks/useDataManager';
import Wrapper from './Wrapper';
import Close from './Close';

function ComponentCard({ component, isActive, onClick, onRemoveClick }) {
  const { modifiedData } = useDataManager();

  const getComponentSchema = componentName => {
    return get(modifiedData, ['components', componentName], {
      schema: { icon: null },
    });
  };

  const {
    schema: { icon },
  } = getComponentSchema(component);

  const handleRemoveClick = e => {
    onRemoveClick(e);

    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Wrapper onClick={onClick} className={isActive ? 'active' : ''}>
      <div>
        <FontAwesomeIcon icon={icon} />
      </div>
      <p>{component}</p>
      <div className="close-btn" onClick={handleRemoveClick}>
        <Close width="7px" height="7px" />
      </div>
    </Wrapper>
  );
}

ComponentCard.defaultProps = {
  component: null,
  isActive: false,
  onClick: () => {},
  onRemoveClick: () => {},
};

ComponentCard.propTypes = {
  component: PropTypes.string,
  isActive: PropTypes.bool,
  onClick: PropTypes.func,
  onRemoveClick: PropTypes.func,
};

export default ComponentCard;
