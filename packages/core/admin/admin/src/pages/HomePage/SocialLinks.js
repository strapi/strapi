/**
 *
 * SocialLink
 */

import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { useAppInfo } from '@strapi/helper-plugin';
import { Typography, Box, Flex, Grid, GridItem } from '@strapi/design-system';
import { Link, LinkButton } from '@strapi/design-system/v2';
import { ExternalLink, Github, Discord, Reddit, Strapi, Twitter, Discourse } from '@strapi/icons';

const StyledDiscord = styled(Discord)`
  path {
    fill: #7289da !important;
  }
`;

const StyledReddit = styled(Reddit)`
  > path:first-child {
    fill: #ff4500;
  }
`;
const StyledStrapi = styled(Strapi)`
  > path:first-child {
    fill: #4945ff;
  }
  > path:nth-child(2) {
    fill: #fff;
  }
  > path:nth-child(4) {
    fill: #9593ff;
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
    name: { id: 'app.components.HomePage.community.links.github', defaultMessage: 'Github' },
    link: 'https://github.com/strapi/strapi/',
    icon: <Github fill="#7289DA" />,
    alt: 'github',
  },
  {
    name: { id: 'app.components.HomePage.community.links.discord', defaultMessage: 'Discord' },
    link: 'https://discord.strapi.io/',
    icon: <StyledDiscord />,
    alt: 'discord',
  },
  {
    name: { id: 'app.components.HomePage.community.links.reddit', defaultMessage: 'Reddit' },
    link: 'https://www.reddit.com/r/Strapi/',
    icon: <StyledReddit />,
    alt: 'reddit',
  },
  {
    name: { id: 'app.components.HomePage.community.links.twitter', defaultMessage: 'Twitter' },
    link: 'https://twitter.com/strapijs',
    icon: <StyledTwitter />,
    alt: 'twitter',
  },
  {
    name: { id: 'app.components.HomePage.community.links.forum', defaultMessage: 'Forum' },
    link: 'https://forum.strapi.io',
    icon: <StyledDiscourse />,
    alt: 'forum',
  },
  {
    name: { id: 'app.components.HomePage.community.links.blog', defaultMessage: 'Blog' },
    link: 'https://strapi.io/blog?utm_source=referral&utm_medium=admin&utm_campaign=career%20page',
    icon: <StyledStrapi />,
    alt: 'blog',
  },
  {
    name: {
      id: 'app.components.HomePage.community.links.career',
      defaultMessage: 'We are hiring!',
    },
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

const SocialLinks = () => {
  const { formatMessage } = useIntl();
  const { communityEdition } = useAppInfo();

  const socialLinksExtended = [
    ...socialLinks,
    {
      icon: <StyledStrapi />,
      link: communityEdition
        ? 'https://discord.strapi.io'
        : 'https://support.strapi.io/support/home',
      name: {
        id: 'Settings.application.get-help',
        defaultMessage: 'Get help',
      },
    },
  ];

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
        <Flex direction="column" alignItems="stretch" gap={5}>
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Typography variant="delta" as="h2" id="join-the-community">
              {formatMessage({
                id: 'app.components.HomePage.community',
                defaultMessage: 'Join the community',
              })}
            </Typography>
            <Typography textColor="neutral600">
              {formatMessage({
                id: 'app.components.HomePage.community.content',
                defaultMessage:
                  'Discuss with team members, contributors and developers on different channels',
              })}
            </Typography>
          </Flex>
          <Link href="https://feedback.strapi.io/" isExternal endIcon={<ExternalLink />}>
            {formatMessage({
              id: 'app.components.HomePage.roadmap',
              defaultMessage: 'See our road map',
            })}
          </Link>
        </Flex>
      </Box>
      <GridGap>
        {socialLinksExtended.map(({ icon, link, name }) => {
          return (
            <GridItem col={6} s={12} key={name.id}>
              <LinkCustom size="L" startIcon={icon} variant="tertiary" href={link} isExternal>
                {formatMessage(name)}
              </LinkCustom>
            </GridItem>
          );
        })}
      </GridGap>
    </Box>
  );
};

export default SocialLinks;
