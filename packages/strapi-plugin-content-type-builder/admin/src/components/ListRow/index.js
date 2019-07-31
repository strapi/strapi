import React from 'react';
import PropTypes from 'prop-types';
import { capitalize } from 'lodash';

import { FormattedMessage } from 'react-intl';

import attributeIcons from '../../utils/attributeIcons';
import pluginId from '../../pluginId';

import StyledListRow from './StyledListRow';

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

  const src = target ? attributeIcons.relation : attributeIcons[ico];

  const handleClick = () => {
    if (configurable !== false) {
      onClick(attributeId, type);
    }
  };

  return (
    <StyledListRow onClick={handleClick}>
      <td>
        <img src={src} alt={`icon-${ico}`} />
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
              <i className="fa fa-pencil link-icon" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();

                onClickDelete(attributeId);
              }}
            >
              <i className="fa fa-trash link-icon" />
            </button>
          </>
        ) : (
          <i className="fa fa-lock" />
        )}
      </td>
    </StyledListRow>
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

export default ListRow;
