import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { AttributeIcon } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import Curve from '../../icons/Curve';
import UpperFist from '../UpperFirst';
import Wrapper from './Wrapper';

function ListRow({
  configurable,
  name,
  nature,
  onClick,
  plugin,
  target,
  targetUid,
  type,
  mainTypeName,
  editTarget,
  firstLoopComponentName,
  firstLoopComponentUid,
  isFromDynamicZone,
  secondLoopComponentName,
  secondLoopComponentUid,
}) {
  const {
    contentTypes,
    isInDevelopmentMode,
    removeAttribute,
  } = useDataManager();
  const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(type)
    ? 'number'
    : type;

  let readableType = type;
  if (['integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    readableType = 'number';
  } else if (['string'].includes(type)) {
    readableType = 'text';
  }

  const contentTypeFriendlyName = get(
    contentTypes,
    [target, 'schema', 'name'],
    ''
  );
  const src = target ? 'relation' : ico;

  const handleClick = () => {
    if (configurable !== false) {
      const attrType = nature ? 'relation' : type;
      let headerDisplayName = mainTypeName;

      if (firstLoopComponentName) {
        headerDisplayName = firstLoopComponentName;
      }

      if (secondLoopComponentUid) {
        headerDisplayName = secondLoopComponentName;
      }

      onClick(
        // Tells where the attribute is located in the main modifiedData object : contentType, component or components
        editTarget,
        // main data type uid
        secondLoopComponentUid || firstLoopComponentUid || targetUid,
        // Name of the attribute
        name,
        // Type of the attribute
        attrType,
        headerDisplayName,
        firstLoopComponentUid ? mainTypeName : null,
        secondLoopComponentName ? firstLoopComponentName : null,
        secondLoopComponentUid ? firstLoopComponentUid : null
      );
    }
  };
  let loopNumber;

  if (secondLoopComponentUid && firstLoopComponentUid) {
    loopNumber = 2;
  } else if (firstLoopComponentUid) {
    loopNumber = 1;
  } else {
    loopNumber = 0;
  }

  return (
    <Wrapper
      onClick={handleClick}
      className={[
        target ? 'relation-row' : '',
        configurable ? 'clickable' : '',
      ]}
      loopNumber={loopNumber}
    >
      <td>
        <AttributeIcon key={src} type={src} />
        <Curve fill={isFromDynamicZone ? '#AED4FB' : '#f3f4f4'} />
      </td>
      <td style={{ fontWeight: 600 }}>
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
                  <UpperFist content={contentTypeFriendlyName} />
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
        {configurable && isInDevelopmentMode ? (
          <>
            <button type="button" onClick={handleClick}>
              <FontAwesomeIcon className="link-icon" icon="pencil-alt" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();

                removeAttribute(
                  editTarget,
                  name,
                  secondLoopComponentUid || firstLoopComponentUid || ''
                );
              }}
            >
              <FontAwesomeIcon className="link-icon" icon="trash" />
            </button>
          </>
        ) : (
          <button>
            <FontAwesomeIcon icon="lock" />
          </button>
        )}
      </td>
    </Wrapper>
  );
}

ListRow.defaultProps = {
  configurable: true,
  firstLoopComponentName: null,
  firstLoopComponentUid: null,
  isFromDynamicZone: false,
  nature: null,
  onClick: () => {},
  onClickDelete: () => {},
  plugin: null,
  secondLoopComponentName: null,
  secondLoopComponentUid: null,
  target: null,
  targetUid: null,
  type: null,
};

ListRow.propTypes = {
  configurable: PropTypes.bool,
  editTarget: PropTypes.string.isRequired,
  firstLoopComponentName: PropTypes.string,
  firstLoopComponentUid: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  mainTypeName: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  nature: PropTypes.string,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  secondLoopComponentName: PropTypes.string,
  secondLoopComponentUid: PropTypes.string,
  target: PropTypes.string,
  targetUid: PropTypes.string,
  type: PropTypes.string,
};

export default memo(ListRow);
export { ListRow };
