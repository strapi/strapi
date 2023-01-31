import React, { useState } from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Box, Flex, FocusTrap, Typography, Icon, Stack } from '@strapi/design-system';
import { Book, Cross, Information, Question } from '@strapi/icons';
import { pxToRem } from '@strapi/helper-plugin';

import { useConfigurations } from '../../../hooks';

const OnboardingWrapper = styled(Box)`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[2]};
  right: ${({ theme }) => theme.spaces[2]};
`;

const Button = styled(Box)`
  width: ${({ theme }) => theme.spaces[8]};
  height: ${({ theme }) => theme.spaces[8]};
  background: ${({ theme }) => theme.colors.primary600};
  box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  border-radius: 50%;

  svg path {
    fill: ${({ theme }) => theme.colors.buttonNeutral0};
  }
`;

const LinksWrapper = styled(Box)`
  bottom: ${({ theme }) => `${theme.spaces[9]}`};
  min-width: ${200 / 16}rem;
  position: absolute;
  right: 0;
`;

const StyledLink = styled(Flex)`
  text-decoration: none;

  svg path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }

  &:focus,
  &:hover {
    background: ${({ theme }) => theme.colors.neutral100};

    svg path {
      fill: ${({ theme }) => theme.colors.neutral700};
    }

    ${[Typography]} {
      color: ${({ theme }) => theme.colors.neutral700};
    }
  }
`;

const Onboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { formatMessage } = useIntl();
  const { showTutorials } = useConfigurations();

  if (!showTutorials) {
    return null;
  }

  const STATIC_LINKS = [
    {
      Icon: <Book />,
      label: formatMessage({
        id: 'global.documentation',
        defaultMessage: 'Documentation',
      }),
      destination: 'https://docs.strapi.io',
    },
    {
      Icon: <Information />,
      label: formatMessage({ id: 'app.static.links.cheatsheet', defaultMessage: 'CheatSheet' }),
      destination: 'https://strapi-showcase.s3-us-west-2.amazonaws.com/CheatSheet.pdf',
    },
  ];

  const handleClick = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <OnboardingWrapper as="aside">
      <Button
        as="button"
        id="onboarding"
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
        onClick={handleClick}
      >
        <Icon as={isOpen ? Cross : Question} height={pxToRem(16)} width={pxToRem(16)} />
      </Button>

      {/* FIX ME - replace with popover when overflow popover is fixed 
       + when v4 mockups for onboarding component are ready */}
      {isOpen && (
        <FocusTrap onEscape={handleClick}>
          <LinksWrapper background="neutral0" hasRadius shadow="tableShadow" padding={2}>
            {STATIC_LINKS.map((link) => (
              <StyledLink
                as="a"
                key={link.label}
                rel="nofollow noreferrer noopener"
                target="_blank"
                href={link.destination}
                padding={2}
                hasRadius
                alignItems="center"
              >
                <Stack horizontal spacing={2}>
                  {link.Icon}
                  <Typography color="neutral600">{link.label}</Typography>
                </Stack>
              </StyledLink>
            ))}
          </LinksWrapper>
        </FocusTrap>
      )}
    </OnboardingWrapper>
  );
};

export default Onboarding;
