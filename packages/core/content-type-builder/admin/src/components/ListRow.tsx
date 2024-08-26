import { memo } from 'react';

import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { Lock, Pencil, Trash } from '@strapi/icons';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useDataManager } from '../hooks/useDataManager';
import { Curve } from '../icons/Curve';
import { getTrad } from '../utils/getTrad';

import { AttributeIcon, IconByType } from './AttributeIcon';
import { DisplayedType } from './DisplayedType';
import { UpperFirst } from './UpperFirst';

export const BoxWrapper = styled(Box)`
  position: relative;
`;

type ListRowProps = {
  configurable?: boolean;
  customField?: string | null;
  editTarget: string;
  firstLoopComponentUid?: string | null;
  isFromDynamicZone?: boolean;
  name: string;
  onClick: (
    editTarget: string,
    targetUid: string | null,
    attributeName: string,
    attributeType: string,
    customField: string | null
  ) => void;
  relation?: string;
  repeatable?: boolean;
  secondLoopComponentUid?: string | null;
  target?: string | null;
  targetUid?: string | null;
  type: IconByType;
};

export const ListRow = memo(
  ({
    configurable = true,
    customField = null,
    editTarget,
    firstLoopComponentUid = null,
    isFromDynamicZone = false,
    name,
    onClick,
    relation = '',
    repeatable = false,
    secondLoopComponentUid = null,
    target = null,
    targetUid = null,
    type,
  }: ListRowProps) => {
    const { contentTypes, isInDevelopmentMode, removeAttribute } = useDataManager();
    const { formatMessage } = useIntl();

    const isMorph = type === 'relation' && relation.includes('morph');
    const ico = ['integer', 'biginteger', 'float', 'decimal'].includes(type) ? 'number' : type;

    const contentType = get(contentTypes, [target as keyof typeof contentTypes], {});
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
          attrType,
          customField
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
        tag="tr"
        onClick={isInDevelopmentMode && configurable && !isMorph ? handleClick : undefined}
      >
        <td style={{ position: 'relative' }}>
          {loopNumber !== 0 && <Curve color={isFromDynamicZone ? 'primary200' : 'neutral150'} />}
          <Flex paddingLeft={2} gap={4}>
            <AttributeIcon type={src} customField={customField} />
            <Typography textColor="neutral800" fontWeight="bold">
              {name}
            </Typography>
          </Flex>
        </td>
        <td>
          {target ? (
            <Typography textColor="neutral800">
              {formatMessage({
                id: getTrad(
                  `modelPage.attribute.${isMorph ? 'relation-polymorphic' : 'relationWith'}`
                ),
                defaultMessage: 'Relation with',
              })}
              &nbsp;
              <span style={{ fontStyle: 'italic' }}>
                <UpperFirst content={contentTypeFriendlyName} />
                &nbsp;
                {isPluginContentType &&
                  `(${formatMessage({
                    id: getTrad(`from`),
                    defaultMessage: 'from',
                  })}: ${isPluginContentType})`}
              </span>
            </Typography>
          ) : (
            <DisplayedType type={type} customField={customField} repeatable={repeatable} />
          )}
        </td>
        <td>
          {isInDevelopmentMode ? (
            <Flex justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
              {configurable ? (
                <Flex gap={1}>
                  {!isMorph && (
                    <IconButton
                      onClick={handleClick}
                      label={`${formatMessage({
                        id: 'app.utils.edit',
                        defaultMessage: 'Edit',
                      })} ${name}`}
                      variant="ghost"
                    >
                      <Pencil />
                    </IconButton>
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
                    variant="ghost"
                  >
                    <Trash />
                  </IconButton>
                </Flex>
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
            <Box height="3.2rem" />
          )}
        </td>
      </BoxWrapper>
    );
  }
);
