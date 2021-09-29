/**
 *
 * SocialLink
 */

import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { H3, Text } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { LinkButton } from '@strapi/parts/LinkButton';
import { Link } from '@strapi/parts/Link';
import ExternalLink from '@strapi/icons/ExternalLink';
import Github from '@strapi/icons/Github';
import Slack from '@strapi/icons/Slack';
import Reddit from '@strapi/icons/Reddit';
import Strapi from '@strapi/icons/Strapi';
import Twitter from '@strapi/icons/Twitter';
import Discourse from '@strapi/icons/Discourse';

const StyledDiscord = styled(Slack)`
  path {
    fill: #7289da !important;
  }
`;

const StyledReddit = styled(Reddit)`
  > path:first-child {
    fill: #ff4500;
  }
  > path:last-child {
    fill: ${({ theme }) => theme.colors.neutral0};
  }
`;
const StyledStrapi = styled(Strapi)`
  > path:first-child {
    fill: #8e75ff;
  }
  > path:nth-child(2) {
    fill: #8e75ff;
  }
  > path:nth-child(3) {
    fill: #8e75ff;
  }
`;

const StyledTwitter = styled(Twitter)`
  path {
    fill: #1da1f2 !important;
  }
`;

const StyledDiscourse = styled(Discourse)`
  > path:first-child {
    fill: #231f20;
  }
  > path:nth-child(2) {
    fill: #fff9ae;
  }
  > path:nth-child(3) {
    fill: #00aeef;
  }
  > path:nth-child(4) {
    fill: #00a94f;
  }
  > path:nth-child(5) {
    fill: #f15d22;
  }
  > path:nth-child(6) {
    fill: #e31b23;
  }
`;

const socialLinks = [
  {
    name: 'Github',
    link: 'https://github.com/strapi/strapi/',
    icon: <Github fill="#7289DA" />,
    alt: 'github',
  },
  {
    name: 'Discord',
    link: 'https://slack.strapi.io/',
    icon: <StyledDiscord />,
    alt: 'discord',
  },
  {
    name: 'Reddit',
    link: 'https://www.reddit.com/r/Strapi/',
    icon: <StyledReddit />,
    alt: 'reddit',
  },
  {
    name: 'Twitter',
    link: 'https://twitter.com/strapijs',
    icon: <StyledTwitter />,
    alt: 'twitter',
  },
  {
    name: 'Forum',
    link: 'https://forum.strapi.io',
    icon: <StyledDiscourse />,
    alt: 'forum',
  },
  {
    name: 'Blog',
    link: 'https://strapi.io/blog?utm_source=referral&utm_medium=admin&utm_campaign=career%20page',
    icon: <StyledStrapi />,
    alt: 'blog',
  },
  {
    name: 'We are hiring!',
    link: 'https://strapi.io/careers?utm_source=referral&utm_medium=admin&utm_campaign=blog',
    icon: <StyledStrapi />,
    alt: 'career',
  },
];

const LinkCustom = styled(LinkButton)`
  display: flex;
  align-items: center;
  border: none;

  svg {
    width: ${({ theme }) => theme.spaces[6]};
    height: ${({ theme }) => theme.spaces[6]};
  }

  span {
    word-break: keep-all;
  }
`;

const GridGap = styled(Grid)`
  row-gap: ${({ theme }) => theme.spaces[2]};
  column-gap: ${({ theme }) => theme.spaces[4]};
`;

const WordWrap = styled(Text)`
  word-break: break-word;
`;

const SocialLinks = () => {
  const { formatMessage } = useIntl();

  return (
    <Box
      as="aside"
      aria-labelledby="join-the-community"
      background="neutral0"
      hasRadius
      paddingRight={5}
      paddingLeft={5}
      paddingTop={6}
      paddingBottom={6}
      shadow="tableShadow"
    >
      <Box paddingBottom={7}>
        <Stack size={5}>
          <Stack size={3}>
            <H3 as="h2" id="join-the-community">
              {formatMessage({
                id: 'app.components.HomePage.community',
                defaultMessage: 'Join the community',
              })}
            </H3>
            <WordWrap textColor="neutral600">
              {formatMessage({
                id: 'app.components.HomePage.community.content',
                defaultMessage:
                  'Discuss with team members, contributors and developers on different channels',
              })}
            </WordWrap>
          </Stack>
          <Link
            href="https://portal.productboard.com/strapi/1-roadmap/tabs/2-under-consideration"
            endIcon={<ExternalLink />}
          >
            {formatMessage({
              id: 'app.components.HomePage.roadmap',
              defaultMessage: 'See our road map',
            })}
          </Link>
        </Stack>
      </Box>
      <GridGap>
        {socialLinks.map(socialLink => {
          return (
            <GridItem col={6} s={12} key={socialLink.name}>
              <LinkCustom
                size="L"
                startIcon={socialLink.icon}
                variant="tertiary"
                href={socialLink.link}
              >
                {socialLink.name}
              </LinkCustom>
            </GridItem>
          );
        })}
      </GridGap>
    </Box>
  );
};

export default SocialLinks;
