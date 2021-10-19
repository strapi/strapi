import React, { useState } from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { Icon } from '@strapi/parts/Icon';
import IconDocumentation from '@strapi/icons/IconDocumentation';
import TypeFileDefault from '@strapi/icons/TypeFileDefault';
import { FocusTrap } from '@strapi/parts/FocusTrap';
import { useConfigurations } from '../../../hooks';

const Button = styled(Row)`
  border-radius: 50%;
  svg {
    color: ${({ theme }) => theme.colors.neutral0};
  }
`;

const StyledLink = styled(Row)`
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral100};
    color: ${({ theme }) => theme.colors.neutral500};

    svg {
      color: ${({ theme }) => theme.colors.neutral700};
    }

    ${[Text]} {
      color: ${({ theme }) => theme.colors.neutral700};
    }
  }

  ${[Text]} {
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

  const staticLinks = [
    {
      icon: IconDocumentation,
      label: formatMessage({
        id: 'app.components.LeftMenuFooter.documentation',
        defaultMessage: 'Documentation',
      }),
      destination: 'https://strapi.io/documentation',
    },
    {
      icon: TypeFileDefault,
      label: formatMessage({ id: 'app.static.links.cheatsheet', defaultMessage: 'CheatSheet' }),
      destination: 'https://strapi-showcase.s3-us-west-2.amazonaws.com/CheatSheet.pdf',
    },
  ];

  const handleClick = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <>
      <Button
        position="fixed"
        bottom={2}
        right={2}
        justifyContent="center"
        as="button"
        id="onboarding"
        height={`${40 / 16}rem`}
        width={`${40 / 16}rem`}
        background="primary600"
        shadow="tableShadow"
        aria-label={formatMessage({
          id: 'app.components.Onboarding.help.button',
          defaultMessage: 'Help button',
        })}
        onClick={handleClick}
      >
        {!isOpen && <FontAwesomeIcon icon={faQuestion} />}
        {isOpen && <FontAwesomeIcon icon={faTimes} />}
      </Button>

      {/* FIX ME - replace with popover when overflow popover is fixed 
       + when v4 mockups for onboarding component are ready */}
      {isOpen && (
        <FocusTrap onEscape={handleClick}>
          <Box
            background="neutral0"
            hasRadius
            shadow="tableShadow"
            paddingBottom={2}
            paddingTop={2}
            position="absolute"
            bottom={10}
            right={2}
            width={`${200 / 16}rem`}
          >
            {staticLinks.map(link => (
              <StyledLink
                as="a"
                key={link.label}
                rel="nofollow noreferrer noopener"
                target="_blank"
                href={link.destination}
                paddingTop={2}
                paddingBottom={2}
                paddingRight={5}
                paddingLeft={5}
              >
                <Icon as={link.icon} color="neutral600" marginRight={2} />
                <Text>{link.label}</Text>
              </StyledLink>
            ))}
          </Box>
        </FocusTrap>
      )}
    </>
  );
};

export default Onboarding;
