import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { capitalize } from 'lodash';
import { Collapse } from 'reactstrap';

import { FormattedMessage } from 'react-intl';

import attributeIcons from '../../utils/attributeIcons';
import pluginId from '../../pluginId';

import StyledListRowCollapse from './StyledListRowCollapse';

function ListRowCollapse({
  attributeId,
  configurable,
  group,
  groups,
  name,
  onClick,
  onClickDelete,
  onClickGoTo,
  plugin,
  target,
  type,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(type)
    ? 'number'
    : type;

  const src = target ? attributeIcons.relation : attributeIcons[ico];

  const handleClick = () => {
    if (configurable !== false) {
      onClick(attributeId, type);
    }
  };

  const handleGoTo = () => {
    onClickGoTo(groups[group]);
  };

  const toggle = () => {
    setIsOpen(prevState => !prevState);
  };

  const getGroupFields = () => {
    const { attributes } = groups[group];
    return attributes;
  };

  const actionOnRowClick = () => {
    if (type === 'group') {
      toggle();
    } else {
      handleClick();
    }
  };

  return (
    <StyledListRowCollapse
      className={[
        target ? 'relation-row' : '',
        configurable ? 'clickable' : '',
      ]}
    >
      <td>
        <div onClick={actionOnRowClick}>
          <table>
            <tbody>
              <tr>
                <td>
                  <img src={src} alt={`icon-${ico}`} />
                  <p>{name}</p>
                </td>
                <td>
                  {target ? (
                    <div className="relation-wrapper">
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
                    <div className="type-wrapper">
                      <FormattedMessage id={`${pluginId}.attribute.${type}`} />
                      {type === 'group' && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();

                            handleGoTo();
                          }}
                        >
                          <FormattedMessage
                            id={`${pluginId}.modelPage.contentType.list.group.link`}
                          />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="btn-wrapper">
                    {configurable ? (
                      <>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();

                            handleClick();
                          }}
                        >
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
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {type === 'group' && (
          <Collapse isOpen={isOpen} className="collapse-body">
            <table>
              <tbody>
                {getGroupFields().map(attribute => {
                  const { name, target } = attribute;
                  const attrType = attribute.type;
                  const icoField = [
                    'integer',
                    'biginteger',
                    'float',
                    'decimal',
                  ].includes(attrType)
                    ? 'number'
                    : attrType;
                  const srcField = target
                    ? attributeIcons.relation
                    : attributeIcons[icoField];

                  return (
                    <tr key={name}>
                      <td>
                        <img src={srcField} alt={`icon-${icoField}`} />
                        <p>{name}</p>
                      </td>
                      <td>
                        <p>{attrType}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Collapse>
        )}
      </td>
    </StyledListRowCollapse>
  );
}

ListRowCollapse.defaultProps = {
  configurable: true,
  group: null,
  groups: {},
  onClick: () => {},
  onClickDelete: () => {},
  onClickGoTo: () => {},
  plugin: null,
  target: null,
  type: null,
};

ListRowCollapse.propTypes = {
  attributeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  configurable: PropTypes.bool,
  group: PropTypes.string,
  groups: PropTypes.object,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onClickDelete: PropTypes.func,
  onClickGoTo: PropTypes.func,
  plugin: PropTypes.string,
  target: PropTypes.string,
  type: PropTypes.string,
};

export default ListRowCollapse;
