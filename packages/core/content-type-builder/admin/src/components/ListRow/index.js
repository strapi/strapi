import React, { memo } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { IconButton } from '@strapi/design-system/IconButton';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import Lock from '@strapi/icons/Lock';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { stopPropagation, onRowClick, pxToRem } from '@strapi/helper-plugin';
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

  const contentType = get(contentTypes, [target], {});
  const contentTypeFriendlyName = get(contentType, ['schema', 'displayName'], '');
  const isPluginContentType = get(contentType, 'plugin');

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
        <Stack paddingLeft={2} spacing={4} horizontal>
          <AttributeIcon key={src} type={src} />
          <Typography fontWeight="bold">{name}</Typography>
        </Stack>
      </td>
      <td>
        {target ? (
          <Typography>
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
              {isPluginContentType &&
                `(${formatMessage({
                  id: getTrad(`from`),
                  defaultMessage: 'from',
                })}: ${isPluginContentType})`}
            </span>
          </Typography>
        ) : (
          <Typography>
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
          </Typography>
        )}
      </td>
      <td>
        {isInDevelopmentMode ? (
          <Flex justifyContent="flex-end" {...stopPropagation}>
            {configurable ? (
              <Stack horizontal spacing={1}>
                {!isMorph && (
                  <IconButton
                    onClick={handleClick}
                    label={`${formatMessage({
                      id: 'app.utils.edit',
                      defaultMessage: 'Edit',
                    })} ${name}`}
                    noBorder
                    icon={<Pencil />}
                  />
                )}
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttribute(
                      editTarget,
                      name,
                      secondLoopComponentUid || firstLoopComponentUid || ''
                    );
                  }}
                  label={`${formatMessage({
                    id: 'global.delete',
                    defaultMessage: 'Delete',
                  })} ${name}`}
                  noBorder
                  icon={<Trash />}
                />
              </Stack>
            ) : (
              <Lock />
            )}
          </Flex>
        ) : (
          /*
            In production mode the edit icons aren't visible, therefore
            we need to reserve the same space, otherwise the height of the
            row might collapse, leading to bad positioned curve icons
          */
          <Box height={pxToRem(32)} />
        )}
      </td>
    </BoxWrapper>
  );
}

ListRow.defaultProps = {
  configurable: true,
  firstLoopComponentUid: null,
  isFromDynamicZone: false,
  onClick() {},
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
  relation: PropTypes.string,
  repeatable: PropTypes.bool,
  secondLoopComponentUid: PropTypes.string,
  target: PropTypes.string,
  targetUid: PropTypes.string,
  type: PropTypes.string,
};

export default memo(ListRow);
export { ListRow };
