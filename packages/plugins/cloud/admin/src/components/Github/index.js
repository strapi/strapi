/*
 *
 * Github component
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';

import styled from 'styled-components';

import { Github } from '@strapi/icons';
import { Box, Flex, Typography } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';

import { LinkIcon } from '../Icons/link';
import { CheckIcon } from '../Icons/check';

import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const EmptyStateIconWrapper = styled(Box)`
  svg {
    height: ${88 / 16}rem;
  }
`;

const CustomGithubButton = styled(LinkButton)`
  background-color: #000000;
  color: #ffffff;
  border: none;
  :hover {
    background-color: #32324d;
    border: none;
  }
`;

const GithubBox = ({ isVersionedOnGit }) => {
  const { formatMessage } = useIntl();
  return (
    <Box padding={4}>
      <Flex alignItems="center" direction="column" padding={11}>
        <EmptyStateIconWrapper paddingBottom={6} aria-hidden>
          {isVersionedOnGit ? <CheckIcon /> : <LinkIcon />}
        </EmptyStateIconWrapper>
        <Box paddingBottom={4}>
          <Typography
            variant="beta"
            as="p"
            textAlign="center"
            textColor="neutral1000"
          >
            {isVersionedOnGit
              ? formatMessage({
                  id: getTrad('Homepage.githubBox.title.versioned'),
                  defaultMessage: 'Project pushed to GitHub',
                })
              : formatMessage({
                  id: getTrad('Homepage.githubBox.title.not-versioned'),
                  defaultMessage: 'Push your project on GitHub',
                })}
          </Typography>
        </Box>
        <Typography
          variant="epsilon"
          as="p"
          textAlign="center"
          textColor="neutral600"
        >
          {isVersionedOnGit
            ? formatMessage({
                id: getTrad('Homepage.githubBox.subTitle.versioned'),
                defaultMessage:
                  "You did it! You're just one step ahead of having your project hosted online.",
              })
            : formatMessage({
                id: getTrad('Homepage.githubBox.subTitle.not-versioned'),
                defaultMessage:
                  'Your project has to be versioned on GitHub before deploying on Strapi Cloud.',
              })}
        </Typography>
        {!isVersionedOnGit && (
          <Box marginTop={4}>
            <CustomGithubButton
              isExternal
              startIcon={<Github />}
              href="https://github.com/new"
              target="_blank"
            >
              {formatMessage({
                id: getTrad('Homepage.githubBox.buttonText'),
                defaultMessage: 'Upload to GitHub',
              })}
            </CustomGithubButton>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default GithubBox;
