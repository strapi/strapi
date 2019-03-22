import React from 'react';
import PropTypes from 'prop-types';
import { camelCase, truncate } from 'lodash';
import { FormattedMessage } from 'react-intl';

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

const NaturePicker = ({ keyTarget, modelName, name, onClick, nature }) => {
  const nameModel = keyTarget === '-' ? modelName : keyTarget || modelName;
  const { leftName, rightName } = ['manyToMany', 'oneToMany', 'oneToOne', 'oneWay'].includes(nature)
    ? { leftName: nameModel, rightName: name }
    : { leftName: name, rightName: keyTarget };

  return (
    <InlineBlock style={{ width: '100%', paddingTop: '70px' }}>
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
  keyTarget: '',
  modelName: '',
  name: '',
  nature: 'oneWay',
  onClick: () => {},
};

NaturePicker.propTypes = {
  keyTarget: PropTypes.string,
  modelName: PropTypes.string,
  name: PropTypes.string,
  nature: PropTypes.string,
  onClick: PropTypes.func,
};

export default NaturePicker;
