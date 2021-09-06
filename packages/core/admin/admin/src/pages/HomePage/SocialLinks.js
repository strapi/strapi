/**
 *
 * SocialLink
 */

import React from 'react';
import styled from 'styled-components';

import { H3, Text } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { LinkButton } from '@strapi/parts/LinkButton';
import { Link } from '@strapi/parts/Link';
import ExternalLink from '@strapi/icons/ExternalLink';
import Forum from '../../assets/images/social_forum.png';
import Reddit from '../../assets/images/social_reddit.png';
import Twitter from '../../assets/images/social_twitter.png';
import Medium from '../../assets/images/social_medium.png';
import Slack from '../../assets/images/social_slack.png';
import Gh from '../../assets/images/social_gh.png';

const socialLinks = [
  {
    name: 'Github',
    link: 'https://github.com/strapi/strapi/',
    img: Gh,
    alt: 'github',
  },
  {
    name: 'Discord',
    link: 'https://slack.strapi.io/',
    img: Slack,
    alt: 'slack',
  },
  {
    name: 'Reddit',
    link: 'https://www.reddit.com/r/Strapi/',
    img: Reddit,
    alt: 'reddit',
  },
  {
    name: 'Twitter',
    link: 'https://twitter.com/strapijs',
    img: Twitter,
    alt: 'twitter',
  },
  {
    name: 'Medium',
    link: 'https://medium.com/@strapi',
    img: Medium,
    alt: 'medium',
  },
  {
    name: 'Forum',
    link: 'https://forum.strapi.io',
    img: Forum,
    alt: 'forum',
  },
];

const LinkCustom = styled(LinkButton)`
  display: flex;
  align-items: center;
  border: none;

  img {
    width: 24px;
    height: 24px;
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
  return (
    <Box
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
            <H3>Join the community</H3>
            <WordWrap textColor="neutral600">
              Discuss with team members, contributors and developers on different channels
            </WordWrap>
          </Stack>
          <Link href="https://strapi.io/" endIcon={<ExternalLink />}>
            see our road map
          </Link>
        </Stack>
      </Box>
      <GridGap>
        {socialLinks.map(socialLink => {
          return (
            <GridItem col={6} s={12} key={socialLink.name}>
              <LinkCustom
                size="L"
                startIcon={<img alt={socialLink.alt} src={socialLink.img} />}
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
