import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Portal } from '@strapi/parts/Portal';
import { FocusTrap } from '@strapi/parts/FocusTrap';
import { IconButton } from '@strapi/parts/IconButton';
import { LinkButton } from '@strapi/parts/LinkButton';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text, Typography, H1 } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import ExternalLink from '@strapi/icons/ExternalLink';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import { setHexOpacity, useLockScroll } from '@strapi/helper-plugin';
import AirBalloon from '../../assets/images/hot-air-balloon.png';
import BigArrow from '../../assets/images/upgrade-details.png';

const UpgradeWrapper = styled(Row)`
  background: ${({ theme }) => setHexOpacity(theme.colors.neutral800, 0.2)};
`;

const PositionedImage = styled(Box)`
  margin-left: 12%;
`;

const StackFlexStart = styled(Stack)`
  align-items: flex-start;
`;

const UpgradePlanModal = ({ onClose, isOpen }) => {
  useLockScroll(isOpen);
  const { formatMessage } = useIntl();

  if (!isOpen) {
    return null;
  }

  return (
    <Portal>
      <UpgradeWrapper
        position="absolute"
        zIndex={3}
        left={0}
        right={0}
        top={0}
        bottom={0}
        paddingLeft={8}
        paddingRight={8}
        justifyContent="center"
      >
        <FocusTrap onEscape={onClose}>
          <Row
            aria-labelledby="upgrade-plan"
            background="neutral0"
            hasRadius
            position="relative"
            width={`${830 / 16}rem`}
            height={`${415 / 16}rem`}
            paddingLeft={11}
            overflow="hidden"
          >
            <Box
              as="img"
              src={AirBalloon}
              alt="air-balloon"
              position="absolute"
              right={0}
              top={0}
              maxWidth={`${360 / 16}rem`}
            />
            <Box position="absolute" right={4} top={4}>
              <IconButton onClick={onClose} aria-label="Close" icon={<CloseAlertIcon />} />
            </Box>
            <StackFlexStart size={6} maxWidth={`${400 / 16}rem`} zIndex={0}>
              <Typography textColor="primary600" fontWeight="bold" fontSize={2} lineHeight={4}>
                {formatMessage({
                  id: 'app.components.UpgradePlanModal.text-ce',
                  defaultMessage: 'COMMUNITY EDITION',
                })}
              </Typography>
              <Stack size={2}>
                <H1 as="h2" id="upgrade-plan">
                  {formatMessage({
                    id: 'app.components.UpgradePlanModal.limit-reached',
                    defaultMessage: 'You have reached the limit',
                  })}
                </H1>
                <Text>
                  {formatMessage({
                    id: 'app.components.UpgradePlanModal.text-power',
                    defaultMessage:
                      'Unlock the full power of Strapi by upgrading your plan to the Enterprise Edition',
                  })}
                </Text>
              </Stack>
              <LinkButton href="https://strapi.io/pricing-self-hosted" endIcon={<ExternalLink />}>
                {formatMessage({
                  id: 'app.components.UpgradePlanModal.button',
                  defaultMessage: 'Learn more',
                })}
              </LinkButton>
            </StackFlexStart>
            <PositionedImage
              as="img"
              src={BigArrow}
              alt="upgrade-arrow"
              width={`${130 / 16}rem`}
              marginRight={5}
              zIndex={0}
            />
          </Row>
        </FocusTrap>
      </UpgradeWrapper>
    </Portal>
  );
};

UpgradePlanModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
};

export default UpgradePlanModal;
