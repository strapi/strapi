import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import get from 'lodash/get';

import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { IconButton } from '@strapi/design-system/IconButton';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import Trash from '@strapi/icons/Trash';
import ArrowDown from '@strapi/icons/ArrowDown';
import ArrowUp from '@strapi/icons/ArrowUp';

import { useContentTypeLayout } from '../../../hooks';
import { getTrad } from '../../../utils';

import FieldComponent from '../../FieldComponent';

const IconButtonCustom = styled(IconButton)`
  background-color: transparent;

  svg path {
    fill: ${({ theme, expanded }) =>
      expanded ? theme.colors.primary600 : theme.colors.neutral600};
  }
`;

const StyledBox = styled(Box)`
  > div:first-child {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  }
`;

const AccordionContentRadius = styled(Box)`
  border-radius: 0 0 ${({ theme }) => theme.spaces[1]} ${({ theme }) => theme.spaces[1]};
`;

const Rectangle = styled(Box)`
  width: ${({ theme }) => theme.spaces[2]};
  height: ${({ theme }) => theme.spaces[4]};
`;

const DynamicZoneComponent = ({
  componentUid,
  formErrors,
  index,
  isFieldAllowed,
  onMoveComponentDownClick,
  onMoveComponentUpClick,
  name,
  onRemoveComponentClick,
  showDownIcon,
  showUpIcon,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const { modifiedData } = useCMEditViewDataManager();
  const { icon, friendlyName, mainValue } = useMemo(() => {
    const componentLayoutData = getComponentLayout(componentUid);

    const {
      info: { icon, displayName },
    } = componentLayoutData;

    const mainField = get(componentLayoutData, ['settings', 'mainField'], 'id');

    const displayedValue =
      mainField === 'id' ? '' : toString(get(modifiedData, [name, index, mainField], ''));

    const mainValue = displayedValue.trim().length < 1 ? '' : ` - ${displayedValue}`;

    return { friendlyName: displayName, icon, mainValue };
  }, [componentUid, getComponentLayout, modifiedData, name, index]);

  const fieldsErrors = Object.keys(formErrors).filter((errorKey) => {
    const errorKeysArray = errorKey.split('.');

    if (`${errorKeysArray[0]}.${errorKeysArray[1]}` === `${name}.${index}`) {
      return true;
    }

    return false;
  });

  let errorMessage;

  if (fieldsErrors.length > 0) {
    errorMessage = formatMessage({
      id: getTrad('components.DynamicZone.error-message'),
      defaultMessage: 'The component contains error(s)',
    });
  }

  const handleToggle = () => {
    setIsOpen((s) => !s);
  };

  return (
    <Box>
      <Flex justifyContent="center">
        <Rectangle background="neutral200" />
      </Flex>
      <StyledBox hasRadius>
        <Accordion expanded={isOpen} onToggle={handleToggle} size="S" error={errorMessage}>
          <AccordionToggle
            startIcon={<FontAwesomeIcon icon={icon} />}
            action={
              <Stack horizontal spacing={0} expanded={isOpen}>
                {showDownIcon && (
                  <IconButtonCustom
                    noBorder
                    label={formatMessage({
                      id: getTrad('components.DynamicZone.move-down-label'),
                      defaultMessage: 'Move component down',
                    })}
                    onClick={onMoveComponentDownClick}
                    icon={<ArrowDown />}
                  />
                )}
                {showUpIcon && (
                  <IconButtonCustom
                    noBorder
                    label={formatMessage({
                      id: getTrad('components.DynamicZone.move-up-label'),
                      defaultMessage: 'Move component up',
                    })}
                    onClick={onMoveComponentUpClick}
                    icon={<ArrowUp />}
                  />
                )}
                {isFieldAllowed && (
                  <IconButtonCustom
                    noBorder
                    label={formatMessage(
                      {
                        id: getTrad('components.DynamicZone.delete-label'),
                        defaultMessage: 'Delete {name}',
                      },
                      { name: friendlyName }
                    )}
                    onClick={onRemoveComponentClick}
                    icon={<Trash />}
                  />
                )}
              </Stack>
            }
            title={`${friendlyName}${mainValue}`}
            togglePosition="left"
          />
          <AccordionContent>
            <AccordionContentRadius background="neutral0">
              <FieldComponent
                componentUid={componentUid}
                icon={icon}
                name={`${name}.${index}`}
                isFromDynamicZone
              />
            </AccordionContentRadius>
          </AccordionContent>
        </Accordion>
      </StyledBox>
    </Box>
  );
};

DynamicZoneComponent.defaultProps = {
  formErrors: {},
  index: 0,
  isFieldAllowed: true,
  showDownIcon: true,
  showUpIcon: true,
};

DynamicZoneComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  formErrors: PropTypes.object,
  index: PropTypes.number,
  isFieldAllowed: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onMoveComponentDownClick: PropTypes.func.isRequired,
  onMoveComponentUpClick: PropTypes.func.isRequired,
  onRemoveComponentClick: PropTypes.func.isRequired,
  showDownIcon: PropTypes.bool,
  showUpIcon: PropTypes.bool,
};

export default DynamicZoneComponent;
