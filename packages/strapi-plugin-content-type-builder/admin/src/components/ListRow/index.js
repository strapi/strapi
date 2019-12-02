import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { capitalize } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { AttributeIcon } from '@buffetjs/core';

import pluginId from '../../pluginId';

import Wrapper from './Wrapper';

function ListRow({
  attributeId,
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
  const src = target ? 'relation' : ico;

  const handleClick = () => {
    if (configurable !== false) {
      onClick(attributeId, type);
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
          <FormattedMessage id={`${pluginId}.attribute.${type}`} />
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

                onClickDelete(attributeId);
              }}
            >
              <i className="fa fa-trash-alt link-icon" />
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
  attributeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
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
