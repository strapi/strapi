import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import {
  Box,
  Button,
  Divider,
  Flex,
  FocusTrap,
  Icon,
  Portal,
  PopoverPrimitives,
  Stack,
  Typography,
} from '@strapi/design-system';
import { Cross, Play, Question } from '@strapi/icons';

import { useConfigurations } from '../../../hooks';
import OnboardingPreview from '../../../assets/images/onboarding-preview.png';
import { VIDEO_LINKS, DOCUMENTATION_LINKS } from './constants';

// TODO: use new Button props derived from Box props with next DS release
const HelperButton = styled(Button)`
  border-radius: 50%;
  padding: ${({ theme }) => theme.spaces[3]};
  // Resetting 2rem height defined by Button component
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

    // Hover style for the number displayed
    div:first-child span {
      color: ${({ theme }) => theme.colors.primary500};
    }

    // Hover style for the label
    span:nth-child(1) {
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const Preview = styled.img`
  width: 56px;
  height: 40px;
  // Same overlay used in ModalLayout
  background: ${({ theme }) => `${theme.colors.neutral800}1F`};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const TextLink = styled(Typography)`
  text-decoration: none;
`;

const Onboarding = () => {
  const buttonRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const { formatMessage } = useIntl();
  const { showTutorials } = useConfigurations();

  if (!showTutorials) {
    return null;
  }

  const handlePopoverVisibility = () => {
    setIsOpen((prev) => !prev);
  };

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
        ref={buttonRef}
      >
        <Icon as={isOpen ? Cross : Question} color="buttonNeutral0" />
      </HelperButton>

      {isOpen && (
        <Portal>
          <PopoverPrimitives.Content
            padding={0}
            source={buttonRef}
            placement="top-end"
            spacing={12}
          >
            <FocusTrap onEscape={handlePopoverVisibility}>
              <Flex
                alignItems="end"
                justifyContent="space-between"
                paddingBottom={4}
                paddingRight={5}
                paddingLeft={5}
                paddingTop={5}
              >
                <Typography fontWeight="bold">
                  {formatMessage({
                    id: 'app.components.Onboarding.title',
                    defaultMessage: 'Get started videos',
                  })}
                </Typography>
                <TextLink
                  as="a"
                  href="https://www.youtube.com/playlist?list=PL7Q0DQYATmvidz6lEmwE5nIcOAYagxWqq"
                  target="_blank"
                  rel="noreferrer noopener"
                  variant="pi"
                  textColor="primary600"
                >
                  {formatMessage({
                    id: 'app.components.Onboarding.link.more-videos',
                    defaultMessage: 'Watch more videos',
                  })}
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
                    <Preview src={OnboardingPreview} alt="onboarding preview" />
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
                    <Typography textColor="neutral600" variant="pi">
                      {duration}
                    </Typography>
                  </Flex>
                </VideoLinkWrapper>
              ))}
              <Stack spacing={2} paddingLeft={5} paddingTop={2} paddingBottom={5}>
                {DOCUMENTATION_LINKS.map(({ label, href, icon }) => (
                  <Stack horizontal spacing={3} key={href}>
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
                  </Stack>
                ))}
              </Stack>
            </FocusTrap>
          </PopoverPrimitives.Content>
        </Portal>
      )}
    </Box>
  );
};

export default Onboarding;
