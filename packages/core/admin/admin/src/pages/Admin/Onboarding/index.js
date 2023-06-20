import React, { useRef, useState } from 'react';

import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  PopoverPrimitives,
  Portal,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { useAppInfo } from '@strapi/helper-plugin';
import { Cross, Message, Play, Question } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import onboardingPreview from '../../../assets/images/onboarding-preview.png';

import { DOCUMENTATION_LINKS, VIDEO_LINKS, WATCH_MORE } from './constants';

// TODO: use new Button props derived from Box props with next DS release
const HelperButton = styled(Button)`
  border-radius: 50%;
  padding: ${({ theme }) => theme.spaces[3]};
  /* Resetting 2rem height defined by Button component */
  height: 100%;
`;

const IconWrapper = styled(Flex)`
  transform: translate(-50%, -50%);
`;

const VideoLinkWrapper = styled(Flex)`
  text-decoration: none;

  :focus-visible {
    outline-offset: ${({ theme }) => `-${theme.spaces[1]}`};
  }

  :hover {
    background: ${({ theme }) => theme.colors.primary100};

    /* Hover style for the number displayed */
    ${Typography}:first-child {
      color: ${({ theme }) => theme.colors.primary500};
    }

    /* Hover style for the label */
    ${Typography}:nth-child(1) {
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const Preview = styled.img`
  width: ${({ theme }) => theme.spaces[10]};
  height: ${({ theme }) => theme.spaces[8]};
  /* Same overlay used in ModalLayout */
  background: ${({ theme }) => `${theme.colors.neutral800}1F`};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const TypographyLineHeight = styled(Typography)`
  /* line height of label and watch more to 1 so they can be better aligned visually */
  line-height: 1;
`;

const TextLink = styled(TypographyLineHeight)`
  text-decoration: none;

  :hover {
    text-decoration: underline;
  }
`;

const Onboarding = () => {
  const triggerRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const { formatMessage } = useIntl();
  const { communityEdition } = useAppInfo();

  const handlePopoverVisibility = () => {
    setIsOpen((prev) => !prev);
  };

  const docLinks = [
    ...DOCUMENTATION_LINKS,
    {
      label: { id: 'Settings.application.get-help', defaultMessage: 'Get help' },
      icon: Message,
      href: communityEdition
        ? 'https://discord.strapi.io'
        : 'https://support.strapi.io/support/home',
    },
  ];

  return (
    <Box as="aside" position="fixed" bottom={2} right={2}>
      <HelperButton
        aria-label={formatMessage(
          isOpen
            ? {
                id: 'app.components.Onboarding.help.button-close',
                defaultMessage: 'Close help menu',
              }
            : {
                id: 'app.components.Onboarding.help.button',
                defaultMessage: 'Open help menu',
              }
        )}
        onClick={handlePopoverVisibility}
        ref={triggerRef}
      >
        <Icon as={isOpen ? Cross : Question} color="buttonNeutral0" />
      </HelperButton>

      {isOpen && (
        <Portal>
          <PopoverPrimitives.Content
            padding={0}
            onDimiss={handlePopoverVisibility}
            source={triggerRef}
            placement="top-end"
            spacing={12}
          >
            <Flex
              justifyContent="space-between"
              paddingBottom={5}
              paddingRight={6}
              paddingLeft={6}
              paddingTop={6}
            >
              <TypographyLineHeight fontWeight="bold">
                {formatMessage({
                  id: 'app.components.Onboarding.title',
                  defaultMessage: 'Get started videos',
                })}
              </TypographyLineHeight>
              <TextLink
                as="a"
                href={WATCH_MORE.href}
                target="_blank"
                rel="noreferrer noopener"
                variant="pi"
                textColor="primary600"
              >
                {formatMessage(WATCH_MORE.label)}
              </TextLink>
            </Flex>
            <Divider />
            {VIDEO_LINKS.map(({ href, duration, label }, index) => (
              <VideoLinkWrapper
                as="a"
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                key={href}
                hasRadius
                paddingTop={4}
                paddingBottom={4}
                paddingLeft={6}
                paddingRight={11}
              >
                <Box paddingRight={5}>
                  <Typography textColor="neutral200" variant="alpha">
                    {index + 1}
                  </Typography>
                </Box>
                <Box position="relative">
                  <Preview src={onboardingPreview} alt="" />
                  <IconWrapper
                    position="absolute"
                    top="50%"
                    left="50%"
                    background="primary600"
                    borderRadius="50%"
                    justifyContent="center"
                    width={6}
                    height={6}
                  >
                    <Icon as={Play} color="buttonNeutral0" width={3} height={3} />
                  </IconWrapper>
                </Box>
                <Flex direction="column" alignItems="start" paddingLeft={4}>
                  <Typography fontWeight="bold">{formatMessage(label)}</Typography>
                  <VisuallyHidden>:</VisuallyHidden>
                  <Typography textColor="neutral600" variant="pi">
                    {duration}
                  </Typography>
                </Flex>
              </VideoLinkWrapper>
            ))}
            <Flex
              direction="column"
              alignItems="stretch"
              gap={2}
              paddingLeft={5}
              paddingTop={2}
              paddingBottom={5}
            >
              {docLinks.map(({ label, href, icon }) => (
                <Flex gap={3} key={href}>
                  <Icon as={icon} color="primary600" />
                  <TextLink
                    as="a"
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    variant="sigma"
                    textColor="primary700"
                  >
                    {formatMessage(label)}
                  </TextLink>
                </Flex>
              ))}
            </Flex>
          </PopoverPrimitives.Content>
        </Portal>
      )}
    </Box>
  );
};

export default Onboarding;
