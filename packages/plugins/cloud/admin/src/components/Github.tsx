/*
 *
 * Github component
 *
 */

import { Box, Flex, Typography, LinkButton } from '@strapi/design-system';
import { GitHub } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../utils/getTrad';

import { LinkIcon } from './Icons/LinkIcon';

const EmptyStateIconWrapper = styled(Box)`
  svg {
    height: 8.8rem;
  }
`;

const CustomGithubButton = styled(LinkButton)`
  background-color: #000000;
  color: #ffffff;
  border: none;

  & svg > path {
    fill: ${({ theme }) => theme.colors.neutral0};
  }

  &:hover {
    background-color: #32324d !important;
    border: none !important;
  }
`;

const GithubBox = () => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={4}>
      <Flex alignItems="center" direction="column" padding={11}>
        <EmptyStateIconWrapper paddingBottom={6} aria-hidden>
          <LinkIcon />
        </EmptyStateIconWrapper>
        <Box paddingBottom={4}>
          <Typography variant="beta" tag="p" textAlign="center" textColor="neutral1000">
            {formatMessage({
              id: getTrad('Homepage.githubBox.title.not-versioned'),
              defaultMessage: 'Push your project on GitHub',
            })}
          </Typography>
        </Box>
        <Typography variant="epsilon" tag="p" textAlign="center" textColor="neutral600">
          {formatMessage({
            id: getTrad('Homepage.githubBox.subTitle.not-versioned'),
            defaultMessage:
              'Your project has to be versioned on GitHub before deploying on Strapi Cloud.',
          })}
        </Typography>
        <Box marginTop={4}>
          <CustomGithubButton
            isExternal
            startIcon={<GitHub />}
            href="https://github.com/new"
            target="_blank"
          >
            {formatMessage({
              id: getTrad('Homepage.githubBox.buttonText'),
              defaultMessage: 'Upload to GitHub',
            })}
          </CustomGithubButton>
        </Box>
      </Flex>
    </Box>
  );
};

export { GithubBox };
