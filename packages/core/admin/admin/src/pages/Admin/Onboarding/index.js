import React, { useState } from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Box, FocusTrap, Typography } from '@strapi/design-system';
import { Book, Cross, Information } from '@strapi/icons';

import { useConfigurations } from '../../../hooks';

const OnboardingWrapper = styled(Box)`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[2]};
  right: ${({ theme }) => theme.spaces[2]};
`;

const Button = styled.button`
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
  position: absolute;
  bottom: ${({ theme }) => `${theme.spaces[9]}`};
  right: 0;
  width: ${200 / 16}rem;
`;

const StyledLink = styled.a`
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: ${({ theme }) => theme.spaces[2]};
  padding-left: ${({ theme }) => theme.spaces[5]};

  svg {
    color: ${({ theme }) => theme.colors.neutral600};
    margin-right: ${({ theme }) => theme.spaces[2]};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.neutral100};
    color: ${({ theme }) => theme.colors.neutral500};

    svg {
      color: ${({ theme }) => theme.colors.neutral700};
    }

    ${[Typography]} {
      color: ${({ theme }) => theme.colors.neutral700};
    }
  }

  ${[Typography]} {
    color: ${({ theme }) => theme.colors.neutral600};
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
        id="onboarding"
        aria-label={formatMessage({
          id: 'app.components.Onboarding.help.button',
          defaultMessage: 'Help button',
        })}
        onClick={handleClick}
      >
        {/* TODO: Information -> Question */}
        {isOpen ? <Cross /> : <Information />}
      </Button>

      {/* FIX ME - replace with popover when overflow popover is fixed 
       + when v4 mockups for onboarding component are ready */}
      {isOpen && (
        <FocusTrap onEscape={handleClick}>
          <LinksWrapper
            background="neutral0"
            hasRadius
            shadow="tableShadow"
            paddingBottom={2}
            paddingTop={2}
          >
            {STATIC_LINKS.map((link) => (
              <StyledLink
                key={link.label}
                rel="nofollow noreferrer noopener"
                target="_blank"
                href={link.destination}
              >
                {link.Icon}
                <Typography>{link.label}</Typography>
              </StyledLink>
            ))}
          </LinksWrapper>
        </FocusTrap>
      )}
    </OnboardingWrapper>
  );
};

export default Onboarding;
