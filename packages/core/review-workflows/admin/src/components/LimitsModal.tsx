import * as React from 'react';

import { Box, Flex, IconButton, Modal, Typography, LinkButton } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import balloonImageSrc from '../assets/balloon.png';

const CTA_LEARN_MORE_HREF = 'https://strapi.io/pricing-cloud';
const CTA_SALES_HREF = 'https://strapi.io/contact-sales';

const Title: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <Modal.Title variant="alpha">{children}</Modal.Title>;
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

export type LimitsModalProps = Pick<Modal.Props, 'open' | 'onOpenChange'>;

const Root: React.FC<React.PropsWithChildren<LimitsModalProps>> = ({
  children,
  open = false,
  onOpenChange,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Body>
          <Flex gap={2} paddingLeft={7} position="relative">
            <Flex alignItems="start" direction="column" gap={2} width="60%">
              {children}

              <CallToActions />
            </Flex>

            <Flex justifyContent="end" height="100%" width="40%">
              <BalloonImage src={balloonImageSrc} aria-hidden alt="" loading="lazy" />

              <Box display="flex" position="absolute" right={0} top={0}>
                <Modal.Close>
                  <IconButton
                    withTooltip={false}
                    label={formatMessage({
                      id: 'global.close',
                      defaultMessage: 'Close',
                    })}
                  >
                    <Cross />
                  </IconButton>
                </Modal.Close>
              </Box>
            </Flex>
          </Flex>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};

const LimitsModal = {
  Title,
  Body,
  Root,
};

export { LimitsModal };
