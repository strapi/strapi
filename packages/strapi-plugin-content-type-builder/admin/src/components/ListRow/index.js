import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { capitalize } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { AttributeIcon } from '@buffetjs/core';

import pluginId from '../../pluginId';

import Wrapper from './Wrapper';
import Component from '../../icons/Component';

function ListRow({
  attributeName,
  configurable,
  name,
  onClick,
  onClickDelete,
  plugin,
  target,
  type,
}) {
  const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(type)
    ? 'number'
    : type;

  let readableType = type;
  if (['integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    readableType = 'number';
  } else if (['string'].includes(type)) {
    readableType = 'text';
  }

  const src = target ? 'relation' : ico;

  const handleClick = () => {
    if (configurable !== false) {
      onClick(attributeName, name, type, name);
    }
  };

  return (
    <Wrapper
      onClick={handleClick}
      className={[
        target ? 'relation-row' : '',
        configurable ? 'clickable' : '',
      ]}
    >
      <td>
        <AttributeIcon key={src} type={src} />
        <Component fill="#f3f4f4" />
      </td>
      <td styles={{ fontWeight: 600 }}>
        <p>{name}</p>
      </td>
      <td>
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
          <FormattedMessage id={`${pluginId}.attribute.${readableType}`} />
        )}
      </td>
      <td>
        {configurable ? (
          <>
            <button type="button" onClick={handleClick}>
              <i className="fa fa-pencil-alt link-icon" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();

                onClickDelete(attributeName);
              }}
            >
              <i className="fas fa-trash-alt link-icon" />
            </button>
          </>
        ) : (
          <i className="fa fa-lock" />
        )}
      </td>
    </Wrapper>
  );
}

ListRow.defaultProps = {
  configurable: true,
  onClick: () => {},
  onClickDelete: () => {},
  plugin: null,
  target: null,
  type: null,
};

ListRow.propTypes = {
  attributeName: PropTypes.string.isRequired,
  configurable: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onClickDelete: PropTypes.func,
  plugin: PropTypes.string,
  target: PropTypes.string,
  type: PropTypes.string,
};

export default memo(ListRow);
export { ListRow };
