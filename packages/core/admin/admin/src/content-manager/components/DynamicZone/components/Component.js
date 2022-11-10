import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { IconButton } from '@strapi/design-system/IconButton';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';

import Trash from '@strapi/icons/Trash';
import ArrowDown from '@strapi/icons/ArrowDown';
import ArrowUp from '@strapi/icons/ArrowUp';

import { useContentTypeLayout } from '../../../hooks';
import { getTrad } from '../../../utils';

import FieldComponent from '../../FieldComponent';

const ActionStack = styled(Stack)`
  svg {
    path {
      fill: ${({ theme, expanded }) =>
        expanded ? theme.colors.primary600 : theme.colors.neutral600};
    }
  }
`;

const IconButtonCustom = styled(IconButton)`
  background-color: transparent;
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
  const { icon, friendlyName } = useMemo(() => {
    const {
      info: { icon, displayName },
    } = getComponentLayout(componentUid);

    return { friendlyName: displayName, icon };
  }, [componentUid, getComponentLayout]);

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
              <ActionStack horizontal spacing={0} expanded={isOpen}>
                {showDownIcon && (
                  <IconButtonCustom
                    noBorder
                    label={formatMessage({
                      id: getTrad('components.DynamicZone.move-up-label'),
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
                      id: getTrad('components.DynamicZone.move-down-label'),
                      defaultMessage: 'Move component down',
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
              </ActionStack>
            }
            title={friendlyName}
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

DynamicZoneComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  formErrors: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isFieldAllowed: PropTypes.bool.isRequired,
  onMoveComponentDownClick: PropTypes.func.isRequired,
  onMoveComponentUpClick: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onRemoveComponentClick: PropTypes.func.isRequired,
  showDownIcon: PropTypes.bool.isRequired,
  showUpIcon: PropTypes.bool.isRequired,
};

export default DynamicZoneComponent;
