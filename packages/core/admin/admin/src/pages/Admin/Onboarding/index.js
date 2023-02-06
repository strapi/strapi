import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { pxToRem } from '@strapi/helper-plugin';
import { Box, Button, Divider, Icon, Popover, Stack, Typography } from '@strapi/design-system';
import { Cross, Question } from '@strapi/icons';

import { useConfigurations } from '../../../hooks';

// TODO: use new Button props derived from Box props with next DS release
const HelperButton = styled(Button)`
  border-radius: 50%;
  padding: ${({ theme }) => theme.spaces[3]};
  // Resetting 2rem height defined by Button component
  height: 100%;
`;

const Onboarding = () => {
  const buttonRef = useRef();
  const [isOpen, setIsOpen] = useState(false);
  const { formatMessage } = useIntl();
  const { showTutorials } = useConfigurations();

  if (!showTutorials) {
    return null;
  }

  // const STATIC_LINKS = [
  //   {
  //     Icon: <Book />,
  //     label: formatMessage({
  //       id: 'global.documentation',
  //       defaultMessage: 'Documentation',
  //     }),
  //     destination: 'https://docs.strapi.io',
  //   },
  //   {
  //     Icon: <Information />,
  //     label: formatMessage({ id: 'app.static.links.cheatsheet', defaultMessage: 'CheatSheet' }),
  //     destination: 'https://strapi-showcase.s3-us-west-2.amazonaws.com/CheatSheet.pdf',
  //   },
  // ];

  const handleClick = () => {
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
        onClick={handleClick}
        ref={buttonRef}
      >
        <Icon as={isOpen ? Cross : Question} color="buttonNeutral0" />
      </HelperButton>

      {/* FIX ME - replace with popover when overflow popover is fixed 
       + when v4 mockups for onboarding component are ready */}
      {isOpen && (
        <Popover placement="top-end" source={buttonRef} spacing={12}>
          <Box width={pxToRem(400)}>
            <Stack
              horizontal
              alignItems="end"
              justifyContent="space-between"
              paddingBottom={4}
              paddingRight={5}
              paddingLeft={5}
              paddingTop={5}
            >
              <Typography fontWeight="bold">Get started videos</Typography>
              <Typography variant="pi" textColor="primary600">
                Watch more videos
              </Typography>
            </Stack>
            <Divider />
            <Box>
              <Typography textColor="neutral200" variant="alpha">
                1
              </Typography>
              <Typography fontWeight="bold">Build a content architecture</Typography>
              <Typography textColor="neutral600" variant="pi">
                5:48
              </Typography>
            </Box>
          </Box>
        </Popover>
      )}
    </Box>
  );
};

export default Onboarding;
