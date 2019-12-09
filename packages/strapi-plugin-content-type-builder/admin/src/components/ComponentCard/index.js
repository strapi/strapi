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

function ComponentCard({ component, dzName, index, isActive, onClick }) {
  const { modifiedData, removeComponentFromDynamicZone } = useDataManager();
  const {
    schema: { icon, name },
  } = get(modifiedData, ['components', component], {
    schema: { icon: null },
  });

  return (
    <Wrapper onClick={onClick} className={isActive ? 'active' : ''}>
      <div>
        <FontAwesomeIcon icon={icon} />
      </div>
      <p>{name}</p>

      <div
        className="close-btn"
        onClick={e => {
          e.stopPropagation();
          removeComponentFromDynamicZone(dzName, index);
        }}
      >
        <Close width="7px" height="7px" />
        {/* <Remove /> */}
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
  dzName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func,
};

export default ComponentCard;
