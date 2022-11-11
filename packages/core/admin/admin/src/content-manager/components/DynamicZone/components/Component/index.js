import React, { memo, Suspense, useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import isEqual from 'react-fast-compare';
import { useIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { IconButton } from '@strapi/design-system/IconButton';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Loader } from '@strapi/design-system/Loader';
import Trash from '@strapi/icons/Trash';
import ArrowDown from '@strapi/icons/ArrowDown';
import ArrowUp from '@strapi/icons/ArrowUp';
import { useContentTypeLayout } from '../../../../hooks';
import { getTrad } from '../../../../utils';
import FieldComponent from '../../../FieldComponent';
import Rectangle from './Rectangle';
import { connect, select } from './utils';

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

const Component = ({
  componentUid,
  formErrors,
  index,
  isOpen,
  isFieldAllowed,
  moveComponentDown,
  moveComponentUp,
  name,
  onToggle,
  removeComponentFromDynamicZone,
  showDownIcon,
  showUpIcon,
  // Passed with the select function
  mainValue,
}) => {
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const { icon, friendlyName } = useMemo(() => {
    const {
      info: { icon, displayName },
    } = getComponentLayout(componentUid);

    return { friendlyName: displayName, icon };
  }, [componentUid, getComponentLayout]);

  const handleMoveComponentDown = () => moveComponentDown(name, index);

  const handleMoveComponentUp = () => moveComponentUp(name, index);

  const handleRemove = () => removeComponentFromDynamicZone(name, index);

  const downLabel = formatMessage({
    id: getTrad('components.DynamicZone.move-down-label'),
    defaultMessage: 'Move component down',
  });
  const upLabel = formatMessage({
    id: getTrad('components.DynamicZone.move-up-label'),
    defaultMessage: 'Move component down',
  });
  const deleteLabel = formatMessage(
    {
      id: getTrad('components.DynamicZone.delete-label'),
      defaultMessage: 'Delete {name}',
    },
    { name: friendlyName }
  );

  const formErrorsKeys = Object.keys(formErrors);

  const fieldsErrors = formErrorsKeys.filter((errorKey) => {
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

  return (
    <Box>
      <Rectangle />
      <StyledBox hasRadius>
        <Accordion expanded={isOpen} onToggle={() => onToggle(index)} size="S" error={errorMessage}>
          <AccordionToggle
            startIcon={<FontAwesomeIcon icon={icon} />}
            action={
              <ActionStack horizontal spacing={0} expanded={isOpen}>
                {showDownIcon && (
                  <IconButtonCustom
                    noBorder
                    label={downLabel}
                    onClick={handleMoveComponentDown}
                    icon={<ArrowDown />}
                  />
                )}
                {showUpIcon && (
                  <IconButtonCustom
                    noBorder
                    label={upLabel}
                    onClick={handleMoveComponentUp}
                    icon={<ArrowUp />}
                  />
                )}
                {isFieldAllowed && (
                  <IconButtonCustom
                    noBorder
                    label={deleteLabel}
                    onClick={handleRemove}
                    icon={<Trash />}
                  />
                )}
              </ActionStack>
            }
            title={`${friendlyName}${mainValue}`}
            togglePosition="left"
          />
          <AccordionContent>
            <AccordionContentRadius background="neutral0">
              <Suspense
                fallback={
                  <Flex justifyContent="center" paddingTop={4} paddingBottom={4}>
                    <Loader>Loading content.</Loader>
                  </Flex>
                }
              >
                <FocusTrap onEscape={() => onToggle(index)}>
                  <FieldComponent
                    componentUid={componentUid}
                    icon={icon}
                    name={`${name}.${index}`}
                    isFromDynamicZone
                  />
                </FocusTrap>
              </Suspense>
            </AccordionContentRadius>
          </AccordionContent>
        </Accordion>
      </StyledBox>
    </Box>
  );
};

Component.propTypes = {
  componentUid: PropTypes.string.isRequired,
  formErrors: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isFieldAllowed: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  moveComponentDown: PropTypes.func.isRequired,
  moveComponentUp: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  removeComponentFromDynamicZone: PropTypes.func.isRequired,
  showDownIcon: PropTypes.bool.isRequired,
  showUpIcon: PropTypes.bool.isRequired,
  mainValue: PropTypes.string.isRequired,
};

const Memoized = memo(Component, isEqual);

export default connect(Memoized, select);
