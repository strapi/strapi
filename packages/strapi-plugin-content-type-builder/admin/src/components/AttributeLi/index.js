/**
*
* AttributeLi
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { capitalize } from 'lodash';

import IcoContainer from 'components/IcoContainer';

import pluginId from '../../pluginId';

import styles from './styles.scss';

const assets = [
  'boolean',
  'date',
  'email',
  'enumeration',
  'media',
  'json',
  'number',
  'password',
  'relation',
  'string',
  'text',
].map(type => {
  return { type, icon: require(`../../assets/images/icon_${type}.png`)};
}).reduce((acc, current) => {
  acc[current.type] = current.icon;

  return acc;
}, {});

function AttributeLi({ attributeInfos: { configurable, plugin, target, type }, name, onClick }) {
  const src = target ? assets.relation : assets[type];
  const icons = configurable === false ? [{ icoType: 'lock' }] : [{ icoType: 'pencil' }, { icoType: 'trash' }];
  const relationStyle = target ? styles.relation : null;
  const configurableStyle = configurable === false ? null : styles.editable;

  return (
    <li
      className={`${styles.attributeLi} ${relationStyle} ${configurableStyle}`}
      onClick={onClick}
    >
      <div className={styles.flex}>
        <div className={styles.nameContainer}>
          <img src={src} alt="icon-type" />
          <div>{name}</div>
        </div>
        <div className={styles.relationContainer}>
          {target ? (
            <div>
              <FormattedMessage id={`${pluginId}.modelPage.attribute.relationWith`} />
              &nbsp;
              <FormattedMessage id={`${pluginId}.from`}>
                {msg => (
                  <span style={{ fontStyle: 'italic' }}>
                    {capitalize(target)}
                    &nbsp;
                    {plugin && `(${msg}: ${plugin})`}
                  </span>
                )}
              </FormattedMessage>
            </div>
          ) : <FormattedMessage id={`${pluginId}.attribute.${type}`} />}
        </div>
        <div className={styles.mainField} />
        <IcoContainer icons={icons} />
      </div>
    </li>
  );
}

AttributeLi.defaultProps = {
  attributeInfos: {
    configurable: true,
    plugin: null,
    target: null,
    type: null,
  },
  onClick: () => {},
};

AttributeLi.propTypes = {
  attributeInfos: PropTypes.shape({
    configurable: PropTypes.bool,
    plugin: PropTypes.string,
    target: PropTypes.string,
    type: PropTypes.string,
  }),
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default AttributeLi;
