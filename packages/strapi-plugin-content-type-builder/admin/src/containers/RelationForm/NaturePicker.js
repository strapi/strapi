import React from 'react';
import PropTypes from 'prop-types';
import { camelCase, truncate } from 'lodash';
import { FormattedMessage } from 'react-intl';
import pluralize from 'pluralize';

import pluginId from '../../pluginId';

import styles from './styles.scss';

import InlineBlock from './InlineBlock';

const assets = ['one_way', 'one_to_one', 'one_to_many', 'many_to_one', 'many_to_many']
  .map(name => {
    return {
      name: camelCase(name),
      icon: require(`../../assets/images/${name}.svg`),
      iconSelected: require(`../../assets/images/${name}_selected.svg`),
    };
  })
  .reduce((acc, current) => {
    acc[current.name] = current;

    return acc;
  }, {});

const availableRelations = ['manyToMany', 'oneToMany', 'oneToOne', 'oneWay'];

/* eslint-disable indent */
const NaturePicker = ({ modelName, onClick, nature, target }) => {
  const { leftName, rightName } = availableRelations.includes(nature)
    ? {
        leftName: pluralize(modelName, nature === 'manyToMany' ? 2 : 1),
        rightName: pluralize(target, ['manyToMany', 'oneToMany', 'manyToOne'].includes(nature) ? 2 : 1),
      }
    : {
        leftName: target,
        rightName: pluralize(modelName, ['manyToMany', 'oneToMany', 'manyToOne'].includes(nature) ? 2 : 1),
      };

  return (
    <InlineBlock style={{ width: '100%', paddingTop: '70px', cursor: 'pointer' }}>
      <div className={styles.relationNatureWrapper}>
        {Object.keys(assets).map(iconName => {
          const src = iconName === nature ? assets[iconName].iconSelected : assets[iconName].icon;

          return <img key={iconName} onClick={() => onClick(iconName, modelName)} src={src} alt={iconName} />;
        })}
      </div>
      <div className={styles.infoContainer}>
        <span>{truncate(leftName, { length: 24 })}</span>
        &nbsp; <FormattedMessage id={`${pluginId}.relation.${nature}`} /> &nbsp;
        <span>{truncate(rightName, { length: 24 })}</span>
      </div>
    </InlineBlock>
  );
};

NaturePicker.defaultProps = {
  modelName: '',
  nature: 'oneWay',
  onClick: () => {},
  target: '',
};

NaturePicker.propTypes = {
  modelName: PropTypes.string,
  nature: PropTypes.string,
  onClick: PropTypes.func,
  target: PropTypes.string,
};

export default NaturePicker;
