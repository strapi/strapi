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

function ComponentCard({ component, dzName, index, isActive, onClick }) {
  const { modifiedData, removeComponentFromDynamicZone } = useDataManager();

  const getComponentSchema = componentName => {
    return get(modifiedData, ['components', componentName], {
      schema: { icon: null },
    });
  };

  const {
    schema: { icon },
  } = getComponentSchema(component);

  return (
    <Wrapper onClick={onClick} className={isActive ? 'active' : ''}>
      <div>
        <FontAwesomeIcon icon={icon} />
      </div>
      <p>{component}</p>
      <p
        onClick={e => {
          e.stopPropagation();
          removeComponentFromDynamicZone(dzName, index);
        }}
      >
        X
      </p>
    </Wrapper>
  );
}

ComponentCard.defaultProps = {
  component: null,
  isActive: false,
  onClick: () => {},
};

ComponentCard.propTypes = {
  component: PropTypes.string,
  dzName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func,
};

export default ComponentCard;
