import * as React from 'react';

import { Box, Flex, IconButton, ModalLayout, ModalBody, Typography } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import balloonImageSrc from './assets/balloon.png';

const TITLE_ID = 'limits-title';

const CTA_LEARN_MORE_HREF = 'https://strapi.io/pricing-cloud';
const CTA_SALES_HREF = 'https://strapi.io/contact-sales';

const Title: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Typography variant="alpha" id={TITLE_ID}>
      {children}
    </Typography>
  );
};

const Body: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <Typography variant="omega">{children}</Typography>;
};

const CallToActions = () => {
  const { formatMessage } = useIntl();

  return (
    <Flex gap={2} paddingTop={4}>
      <LinkButton variant="default" isExternal href={CTA_LEARN_MORE_HREF}>
        {formatMessage({
          id: 'Settings.review-workflows.limit.cta.learn',
          defaultMessage: 'Learn more',
        })}
      </LinkButton>

      <LinkButton variant="tertiary" isExternal href={CTA_SALES_HREF}>
        {formatMessage({
          id: 'Settings.review-workflows.limit.cta.sales',
          defaultMessage: 'Contact Sales',
        })}
      </LinkButton>
    </Flex>
  );
};

const BalloonImage = styled.img`
  // Margin top|right reverse the padding of ModalBody
  margin-right: ${({ theme }) => `-${theme.spaces[7]}`};
  margin-top: ${({ theme }) => `-${theme.spaces[7]}`};
  width: 360px;
`;

export type LimitsModalProps = {
  isOpen?: boolean;
  onClose: () => void;
};

const Root: React.FC<React.PropsWithChildren<LimitsModalProps>> = ({
  children,
  isOpen = false,
  onClose,
}) => {
  const { formatMessage } = useIntl();

  if (!isOpen) {
    return null;
  }

  return (
    <ModalLayout onClose={onClose} labelledBy={TITLE_ID}>
      <ModalBody>
        <Flex gap={2} paddingLeft={7} position="relative">
          <Flex alignItems="start" direction="column" gap={2} width="60%">
            {children}

            <CallToActions />
          </Flex>

          <Flex justifyContent="end" height="100%" width="40%">
            <BalloonImage src={balloonImageSrc} aria-hidden alt="" loading="lazy" />

            <Box display="flex" position="absolute" right={0} top={0}>
              <IconButton
                icon={<Cross />}
                aria-label={formatMessage({
                  id: 'global.close',
                  defaultMessage: 'Close',
                })}
                onClick={onClose}
              />
            </Box>
          </Flex>
        </Flex>
      </ModalBody>
    </ModalLayout>
  );
};

const LimitsModal = {
  Title,
  Body,
  Root,
};

export { LimitsModal };
