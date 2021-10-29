import React, { memo } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { IconButton } from '@strapi/design-system/IconButton';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Text } from '@strapi/design-system/Text';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { stopPropagation, onRowClick } from '@strapi/helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useDataManager from '../../hooks/useDataManager';
import getTrad from '../../utils/getTrad';
import Curve from '../../icons/Curve';
import UpperFist from '../UpperFirst';
import BoxWrapper from './BoxWrapper';
import AttributeIcon from '../AttributeIcon';

function ListRow({
  configurable,
  editTarget,
  firstLoopComponentUid,
  isFromDynamicZone,
  name,
  onClick,
  plugin,
  relation,
  repeatable,
  secondLoopComponentUid,
  target,
  targetUid,
  type,
}) {
  const { contentTypes, isInDevelopmentMode, removeAttribute } = useDataManager();
  const { formatMessage } = useIntl();

  const isMorph = type === 'relation' && relation.includes('morph');
  const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(type) ? 'number' : type;

  let readableType = type;

  if (['integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    readableType = 'number';
  } else if (['string'].includes(type)) {
    readableType = 'text';
  }

  const contentTypeFriendlyName = get(contentTypes, [target, 'schema', 'name'], '');
  const src = target ? 'relation' : ico;

  const handleClick = () => {
    if (isMorph) {
      return;
    }

    if (configurable !== false) {
      const attrType = type;

      onClick(
        // Tells where the attribute is located in the main modifiedData object : contentType, component or components
        editTarget,
        // main data type uid
        secondLoopComponentUid || firstLoopComponentUid || targetUid,
        // Name of the attribute
        name,
        // Type of the attribute
        attrType
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
    <BoxWrapper
      as="tr"
      {...onRowClick({
        fn: handleClick,
        condition: isInDevelopmentMode && configurable && !isMorph,
      })}
    >
      <td style={{ position: 'relative' }}>
        {loopNumber !== 0 && <Curve color={isFromDynamicZone ? 'primary200' : 'neutral150'} />}
        <Stack paddingLeft={2} size={4} horizontal>
          <AttributeIcon key={src} type={src} />
          <Text bold>{upperFirst(name)}</Text>
        </Stack>
      </td>
      <td>
        {target ? (
          <Text>
            {formatMessage({
              id: getTrad(
                `modelPage.attribute.${isMorph ? 'relation-polymorphic' : 'relationWith'}`
              ),
              defaultMessage: 'Relation with',
            })}
            &nbsp;
            <span style={{ fontStyle: 'italic' }}>
              <UpperFist content={contentTypeFriendlyName} />
              &nbsp;
              {plugin &&
                `(${formatMessage({
                  id: getTrad(`from`),
                  defaultMessage: 'from',
                })}: ${plugin})`}
            </span>
          </Text>
        ) : (
          <Text>
            {formatMessage({
              id: getTrad(`attribute.${readableType}`),
              defaultMessage: type,
            })}
            &nbsp;
            {repeatable &&
              formatMessage({
                id: getTrad('component.repeatable'),
                defaultMessage: '(repeatable)',
              })}
          </Text>
        )}
      </td>
      <td>
        {isInDevelopmentMode && (
          <Flex justifyContent="flex-end" {...stopPropagation}>
            {configurable ? (
              <Stack horizontal size={1}>
                {!isMorph && (
                  <IconButton
                    onClick={handleClick}
                    label={`${formatMessage({
                      id: 'app.utils.edit',
                      formatMessage: 'Edit',
                    })} ${name}`}
                    noBorder
                    icon={<Pencil />}
                  />
                )}
                <IconButton
                  onClick={e => {
                    e.stopPropagation();
                    removeAttribute(
                      editTarget,
                      name,
                      secondLoopComponentUid || firstLoopComponentUid || ''
                    );
                  }}
                  label={`${formatMessage({
                    id: 'app.utils.delete',
                    defaultMessage: 'Delete',
                  })} ${name}`}
                  noBorder
                  icon={<Trash />}
                />
              </Stack>
            ) : (
              // ! TODO ASK DESIGN TO PUT LOCK ICON INSIDE DS
              <FontAwesomeIcon icon="lock" />
            )}
          </Flex>
        )}
      </td>
    </BoxWrapper>
  );
}

ListRow.defaultProps = {
  configurable: true,
  firstLoopComponentUid: null,
  isFromDynamicZone: false,
  onClick: () => {},
  plugin: null,
  relation: '',
  repeatable: false,
  secondLoopComponentUid: null,
  target: null,
  targetUid: null,
  type: null,
};

ListRow.propTypes = {
  configurable: PropTypes.bool,
  editTarget: PropTypes.string.isRequired,
  firstLoopComponentUid: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  relation: PropTypes.string,
  repeatable: PropTypes.bool,
  secondLoopComponentUid: PropTypes.string,
  target: PropTypes.string,
  targetUid: PropTypes.string,
  type: PropTypes.string,
};

export default memo(ListRow);
export { ListRow };
