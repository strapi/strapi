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
import { Text, H1 } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import ExternalLink from '@strapi/icons/ExternalLink';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import { setHexOpacity, useLockScroll } from '@strapi/helper-plugin';
import AirBalloon from '../../assets/images/hot-air-balloon.png';
import BigArrow from '../../assets/images/upgrade-details.png';

const UpgradeWrapper = styled.div`
  position: absolute;
  z-index: 3;
  inset: 0;
  background: ${({ theme }) => setHexOpacity(theme.colors.neutral800, 0.2)};
  padding: 0 ${({ theme }) => theme.spaces[8]};
`;

const UpgradeContainer = styled(Row)`
  position: relative;
  max-width: ${830 / 16}rem;
  height: ${415 / 16}rem;
  margin: 0 auto;
  overflow: hidden;
  margin-top: 10%;
  padding-left: ${64 / 16}rem;

  img:first-of-type {
    position: absolute;
    right: 0;
    top: 0;
    max-width: ${360 / 16}rem;
  }

  img:not(:first-of-type) {
    width: ${130 / 16}rem;
    margin-left: 12%;
    margin-right: ${20 / 16}rem;
    z-index: 0;
  }
`;

const TextBold = styled(Text)`
  font-weight: 700;
`;

const StackFlexStart = styled(Stack)`
  align-items: flex-start;
  max-width: ${400 / 16}rem;
  z-index: 0;
`;

const CloseButtonContainer = styled(Box)`
  position: absolute;
  right: ${({ theme }) => theme.spaces[4]};
  top: ${({ theme }) => theme.spaces[4]};
`;

const UpgradePlanModal = ({ onClose, isOpen }) => {
  useLockScroll(isOpen);
  const { formatMessage } = useIntl();

  if (!isOpen) {
    return null;
  }

  return (
    <Portal>
      <UpgradeWrapper>
        <FocusTrap onEscape={onClose}>
          <UpgradeContainer aria-labelledby="upgrade-plan" background="neutral0" hasRadius>
            <img src={AirBalloon} alt="air-balloon" />
            <CloseButtonContainer>
              <IconButton onClick={onClose} aria-label="Close" icon={<CloseAlertIcon />} />
            </CloseButtonContainer>
            <StackFlexStart size={6}>
              <TextBold textColor="primary600">
                {formatMessage({
                  id: 'app.components.UpgradePlanModal.text-ce',
                  defaultMessage: 'COMMUNITY EDITION',
                })}
              </TextBold>
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
            <img src={BigArrow} alt="upgrade-arrow" />
          </UpgradeContainer>
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
