import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Grid,
  Main,
  Typography,
  Link,
  LinkButton,
  TypographyComponent,
  BoxComponent,
  FlexComponent,
} from '@strapi/design-system';
import { ArrowRight, ExternalLink } from '@strapi/icons';
import {
  CodeSquare,
  Discord,
  Discourse,
  FeatherSquare,
  GitHub,
  InformationSquare,
  PlaySquare,
  Reddit,
  Strapi,
  X as Twitter,
} from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { ContentBox } from '../components/ContentBox';
import { GuidedTourHomepage } from '../components/GuidedTour/Homepage';
import { useGuidedTour } from '../components/GuidedTour/Provider';
import { Layouts } from '../components/Layouts/Layout';
import { Page } from '../components/PageHelpers';
import { useAppInfo } from '../features/AppInfo';
import { useTracking } from '../features/Tracking';
import { useContentTypes } from '../hooks/useContentTypes';
import { useEnterprise } from '../hooks/useEnterprise';

import cornerOrnamentPath from './assets/corner-ornament.svg';
import cloudIconBackgroundImage from './assets/strapi-cloud-background.png';
import cloudFlagsImage from './assets/strapi-cloud-flags.svg';

/* -------------------------------------------------------------------------------------------------
 * HomePageCE
 * -----------------------------------------------------------------------------------------------*/

const HomePageCE = () => {
  const { formatMessage } = useIntl();
  // Temporary until we develop the menu API
  const { collectionTypes, singleTypes, isLoading: isLoadingForModels } = useContentTypes();
  const guidedTourState = useGuidedTour('HomePage', (state) => state.guidedTourState);
  const isGuidedTourVisible = useGuidedTour('HomePage', (state) => state.isGuidedTourVisible);
  const isSkipped = useGuidedTour('HomePage', (state) => state.isSkipped);

  const showGuidedTour =
    !Object.values(guidedTourState).every((section) =>
      Object.values(section).every((step) => step)
    ) &&
    isGuidedTourVisible &&
    !isSkipped;
  const navigate = useNavigate();
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();

    navigate('/plugins/content-type-builder/content-types/create-content-type');
  };

  const hasAlreadyCreatedContentTypes = collectionTypes.length > 1 || singleTypes.length > 0;

  if (isLoadingForModels) {
    return <Page.Loading />;
  }

  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage({
          id: 'HomePage.head.title',
          defaultMessage: 'Homepage',
        })}
      </Page.Title>
      <Main>
        <LogoContainer>
          <img alt="" aria-hidden src={cornerOrnamentPath} />
        </LogoContainer>
        <Box padding={10}>
          <Grid.Root>
            <Grid.Item col={8} s={12} direction="column" alignItems="stretch">
              <div>
                <Box paddingLeft={6} paddingBottom={10}>
                  <Flex direction="column" alignItems="flex-start" gap={5}>
                    <Typography tag="h1" variant="alpha">
                      {hasAlreadyCreatedContentTypes
                        ? formatMessage({
                            id: 'app.components.HomePage.welcome.again',
                            defaultMessage: 'Welcome 👋',
                          })
                        : formatMessage({
                            id: 'app.components.HomePage.welcome',
                            defaultMessage: 'Welcome on board!',
                          })}
                    </Typography>
                    <WordWrap textColor="neutral600" variant="epsilon">
                      {hasAlreadyCreatedContentTypes
                        ? formatMessage({
                            id: 'app.components.HomePage.welcomeBlock.content.again',
                            defaultMessage:
                              'We hope you are making progress on your project! Feel free to read the latest news about Strapi. We are giving our best to improve the product based on your feedback.',
                          })
                        : formatMessage({
                            id: 'app.components.HomePage.welcomeBlock.content',
                            defaultMessage:
                              'Congrats! You are logged as the first administrator. To discover the powerful features provided by Strapi, we recommend you to create your first Content type!',
                          })}
                    </WordWrap>
                    {hasAlreadyCreatedContentTypes ? (
                      <Link isExternal href="https://strapi.io/blog">
                        {formatMessage({
                          id: 'app.components.HomePage.button.blog',
                          defaultMessage: 'See more on the blog',
                        })}
                      </Link>
                    ) : (
                      <Button size="L" onClick={handleClick} endIcon={<ArrowRight />}>
                        {formatMessage({
                          id: 'app.components.HomePage.create',
                          defaultMessage: 'Create your first Content type',
                        })}
                      </Button>
                    )}
                  </Flex>
                </Box>
              </div>
            </Grid.Item>
          </Grid.Root>
          <Grid.Root gap={6}>
            <Grid.Item col={8} s={12} direction="column" alignItems="stretch">
              {showGuidedTour ? <GuidedTourHomepage /> : <ContentBlocks />}
            </Grid.Item>
            <Grid.Item col={4} s={12} direction="column" alignItems="stretch">
              <SocialLinks />
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Main>
    </Layouts.Root>
  );
};

const LogoContainer = styled<BoxComponent>(Box)`
  position: absolute;
  top: 0;
  right: 0;

  img {
    width: 15rem;
  }
`;

const WordWrap = styled<TypographyComponent>(Typography)`
  word-break: break-word;
`;

/* -------------------------------------------------------------------------------------------------
 * ContentBlocks
 * -----------------------------------------------------------------------------------------------*/

const ContentBlocks = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <BlockLink
        href="https://cloud.strapi.io"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => {
          trackUsage('didClickOnTryStrapiCloudSection');
        }}
      >
        <Flex
          shadow="tableShadow"
          hasRadius
          padding={6}
          background="neutral0"
          position="relative"
          gap={6}
        >
          <CloudCustomWrapper hasRadius padding={3}>
            <CloudIconWrapper
              width="3.2rem"
              height="3.2rem"
              justifyContent="center"
              hasRadius
              alignItems="center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="15" fill="none">
                <path
                  fill="#fff"
                  fillRule="evenodd"
                  d="M4.39453 13.8298C1.93859 13.6455 0 11.468 0 8.80884 0 6.0289 2.11876 3.7753 4.73238 3.7753c.46775 0 .91964.07218 1.34638.20664C7.21234 1.62909 9.66469 0 12.5073 0c2.5102 0 4.7161 1.27036 5.9782 3.18766a4.54297 4.54297 0 0 1 .6132-.04144C21.8056 3.14622 24 5.54066 24 8.49436c0 2.89194-2.1036 5.24784-4.7323 5.34504v.0031l-1.8948.278a38.18054 38.18054 0 0 1-11.08354 0l-1.89483-.278v-.0127Z"
                  clipRule="evenodd"
                />
              </svg>
            </CloudIconWrapper>
          </CloudCustomWrapper>
          <Flex gap={1} direction="column" alignItems="start">
            <Typography fontWeight="semiBold" variant="pi" textColor="neutral800">
              {formatMessage({
                id: 'app.components.BlockLink.cloud',
                defaultMessage: 'Strapi Cloud',
              })}
            </Typography>
            <Typography textColor="neutral600">
              {formatMessage({
                id: 'app.components.BlockLink.cloud.content',
                defaultMessage: 'Fully-managed cloud hosting for your Strapi project.',
              })}
            </Typography>
            <Box src={cloudFlagsImage} position="absolute" top={0} right={0} tag="img" />
          </Flex>
        </Flex>
      </BlockLink>
      <BlockLink
        href="https://strapi.io/resource-center"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonReadTheDocumentationSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'global.documentation',
            defaultMessage: 'Documentation',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.documentation.content',
            defaultMessage: 'Discover the essential concepts, guides and instructions.',
          })}
          icon={<InformationSquare />}
          iconBackground="primary100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/starters"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonCodeExampleSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.code',
            defaultMessage: 'Code example',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.code.content',
            defaultMessage: 'Learn by using ready-made starters for your projects.',
          })}
          icon={<CodeSquare />}
          iconBackground="warning100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/blog/categories/tutorials"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonTutorialSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.tutorial',
            defaultMessage: 'Tutorials',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.tutorial.content',
            defaultMessage: 'Follow step-by-step instructions to use and customize Strapi.',
          })}
          icon={<PlaySquare />}
          iconBackground="secondary100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/blog"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackUsage('didClickonBlogSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.blog',
            defaultMessage: 'Blog',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.blog.content',
            defaultMessage: 'Read the latest news about Strapi and the ecosystem.',
          })}
          icon={<FeatherSquare />}
          iconBackground="alternative100"
        />
      </BlockLink>
    </Flex>
  );
};

const BlockLink = styled.a`
  text-decoration: none;
`;

const CloudCustomWrapper = styled<BoxComponent>(Box)`
  background-image: url(${cloudIconBackgroundImage});
`;

const CloudIconWrapper = styled<FlexComponent>(Flex)`
  background: rgba(255, 255, 255, 0.3);
`;

/* -------------------------------------------------------------------------------------------------
 * SocialLinks
 * -----------------------------------------------------------------------------------------------*/

const SocialLinks = () => {
  const { formatMessage } = useIntl();
  const communityEdition = useAppInfo('SocialLinks', (state) => state.communityEdition);

  const socialLinksExtended = [
    ...SOCIAL_LINKS,
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
    <Flex
      tag="aside"
      direction="column"
      aria-labelledby="join-the-community"
      background="neutral0"
      hasRadius
      paddingRight={5}
      paddingLeft={5}
      paddingTop={6}
      paddingBottom={6}
      shadow="tableShadow"
      gap={7}
    >
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Typography variant="delta" tag="h2" id="join-the-community">
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
      <GridGap>
        {socialLinksExtended.map(({ icon, link, name }) => {
          return (
            <Grid.Item col={6} s={12} key={name.id} direction="column" alignItems="stretch">
              <LinkCustom size="L" startIcon={icon} variant="tertiary" href={link} isExternal>
                {formatMessage(name)}
              </LinkCustom>
            </Grid.Item>
          );
        })}
      </GridGap>
    </Flex>
  );
};

const StyledGithub = styled(GitHub)`
  path {
    fill: ${(props) => props.theme.colors.neutral800} !important;
  }
`;

const StyledDiscord = styled(Discord)`
  path {
    fill: #7289da !important;
  }
`;

const StyledReddit = styled(Reddit)`
  > path:first-child {
    fill: #ff4500;
  }

  > path:nth-child(2) {
    fill: #fff;
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
  path:first-child {
    fill: #fff;
  }

  path:nth-child(2) {
    fill: #000 !important;
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

const GridGap = styled(Grid.Root)`
  row-gap: ${({ theme }) => theme.spaces[2]};
  column-gap: ${({ theme }) => theme.spaces[4]};
`;

const SOCIAL_LINKS = [
  {
    name: { id: 'app.components.HomePage.community.links.github', defaultMessage: 'Github' },
    link: 'https://github.com/strapi/strapi/',
    icon: <StyledGithub />,
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

/* -------------------------------------------------------------------------------------------------
 * HomePage
 * -----------------------------------------------------------------------------------------------*/

const HomePage = () => {
  const Page = useEnterprise(
    HomePageCE,
    // eslint-disable-next-line import/no-cycle
    async () => (await import('../../../ee/admin/src/pages/HomePage')).HomePageEE
  );

  // block rendering until the EE component is fully loaded
  if (!Page) {
    return null;
  }

  return <Page />;
};

export { HomePage, HomePageCE };
