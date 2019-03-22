import React from 'react';
import PropTypes from 'prop-types';
import { camelCase } from 'lodash';
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

const NaturePicker = ({ keyTarget, modelName, name, nature }) => {
  const nameModel = keyTarget === '-' ? modelName : keyTarget || modelName;
  const { leftName, rightName } = ['manyToMany', 'oneToMany', 'oneToOne', 'oneWay'].includes(nature)
    ? { leftName: nameModel, rightName: name }
    : { leftName: name, rightName: keyTarget };

  return (
    <InlineBlock style={{ width: '100%', paddingTop: '70px' }}>
      <div className={styles.relationNatureWrapper}>
        {Object.keys(assets).map(iconName => {
          const src = iconName === nature ? assets[iconName].iconSelected : assets[iconName].icon;

          return <img key={iconName} src={src} alt={iconName} />;
        })}
      </div>
      <div className={styles.infoContainer}>
        <span>{leftName}</span>
        &nbsp; <FormattedMessage id={`${pluginId}.relation.${nature}`} /> &nbsp;
        <span>{rightName}</span>
      </div>
    </InlineBlock>
  );
};

NaturePicker.defaultProps = {
  keyTarget: '',
  modelName: '',
  name: '',
  nature: 'oneWay',
};

NaturePicker.propTypes = {
  keyTarget: PropTypes.string,
  modelName: PropTypes.string,
  name: PropTypes.string,
  nature: PropTypes.string,
};

export default NaturePicker;
