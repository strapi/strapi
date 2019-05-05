/**
 *
 * AttributeLi
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { capitalize } from 'lodash';
import { IcoContainer } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import assets from './assets';
import styles from './styles.scss';

function AttributeLi({
  attributeInfos: { configurable, plugin, target, type },
  name,
  onClick,
  onClickOnTrashIcon,
}) {
  const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(type)
    ? 'number'
    : type;
  const src = target ? assets.relation : assets[ico];
  /* eslint-disable indent */
  /* istanbul ignore next */
  const icons =
    configurable === false
      ? [{ icoType: 'lock' }]
      : [
          { icoType: 'pencil', onClick: () => onClick(name, type) },
          { icoType: 'trash', onClick: () => onClickOnTrashIcon(name) },
        ];
  const relationStyle = target ? styles.relation : null;
  const configurableStyle = configurable === false ? null : styles.editable;
  /* eslint-enable indent */

  return (
    <li
      className={`${styles.attributeLi} ${relationStyle} ${configurableStyle}`}
      onClick={() => {
        if (configurable !== false) {
          onClick(name, type);
        }
      }}
    >
      <div className={styles.flex}>
        <div className={styles.nameContainer}>
          <img src={src} alt={`icon-${ico}`} />
          <div>{name}</div>
        </div>
        <div className={styles.relationContainer}>
          {target ? (
            <div>
              <FormattedMessage
                id={`${pluginId}.modelPage.attribute.relationWith`}
              />
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
          ) : (
            <FormattedMessage id={`${pluginId}.attribute.${type}`} />
          )}
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
  onClickOnTrashIcon: () => {},
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
  onClickOnTrashIcon: PropTypes.func,
};

export default AttributeLi;
