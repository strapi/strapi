import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { truncate } from 'lodash';
import { FormattedMessage } from 'react-intl';
import pluralize from 'pluralize';

import pluginId from '../../pluginId';

import oneWay from '../../assets/images/one_way.svg';
import oneWaySelected from '../../assets/images/one_way_selected.svg';
import manyWay from '../../assets/images/many_way.svg';
import manyWaySelected from '../../assets/images/many_way_selected.svg';

import StyledRelationNaturePicker from './StyledRelationNaturePicker';

const assets = {
  oneWay: {
    icon: oneWay,
    iconSelected: oneWaySelected,
  },
  manyWay: {
    icon: manyWay,
    iconSelected: manyWaySelected,
  },
};

const RelationNaturePicker = ({ featureName, onClick, nature, target }) => {
  const { leftName, rightName } = {
    leftName: featureName,
    rightName: pluralize(target, ['manyWay'].includes(nature) ? 2 : 1),
  };

  return (
    <StyledRelationNaturePicker>
      <div className="nature-container">
        <div className="nature-buttons">
          {Object.keys(assets).map(iconName => {
            const src =
              iconName === nature
                ? assets[iconName].iconSelected
                : assets[iconName].icon;
            return (
              <img
                key={iconName}
                onClick={() => onClick(iconName, featureName)}
                src={src}
                alt={iconName}
              />
            );
          })}
        </div>
        <div className="nature-txt">
          <span>{truncate(leftName, { length: 24 })}</span>
          &nbsp; <FormattedMessage id={`${pluginId}.relation.${nature}`} />
          &nbsp;
          <span>{truncate(rightName, { length: 24 })}</span>
        </div>
      </div>
    </StyledRelationNaturePicker>
  );
};

RelationNaturePicker.defaultProps = {
  featureName: '',
  nature: 'oneWay',
  onClick: () => {},
  target: '',
};

RelationNaturePicker.propTypes = {
  featureName: PropTypes.string,
  nature: PropTypes.string,
  onClick: PropTypes.func,
  target: PropTypes.string,
};

export default memo(RelationNaturePicker);
export { RelationNaturePicker };
