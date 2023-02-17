import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { ContentBox, useTracking } from '@strapi/helper-plugin';
import { Stack } from '@strapi/design-system/Stack';
import InformationSquare from '@strapi/icons/InformationSquare';
import CodeSquare from '@strapi/icons/CodeSquare';
import PlaySquare from '@strapi/icons/PlaySquare';
import FeatherSquare from '@strapi/icons/FeatherSquare';
import cloudIconBackground from './assets/strapi-cloud-background.png';
import cloudIcon from './assets/strapi-cloud-icon.svg';
import cloudFlags from './assets/strapi-cloud-flags.svg';

const BlockLink = styled.a`
  text-decoration: none;
`;

const CloudCustomWrapper = styled.div`
  width: 56px;
  height: 56px;
  background-image: url(${({ src }) => src});
  padding: 11px;
  margin-right: ${({ theme }) => theme.spaces[6]};
`;

const CloudIconWrapper = styled.div`
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const CloudFlags = styled.img`
  position: absolute;
  top: 0;
  right: 0;
`;

const ContentBlocks = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const handleClick = (eventName) => {
    trackUsage(eventName);
  };

  return (
    <Stack spacing={5}>
      <BlockLink
        href="https://cloud.strapi.io"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => handleClick('didClickOnTryStrapiCloudSection')}
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.cloud',
            defaultMessage: 'Strapi Cloud',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.cloud.content',
            defaultMessage:
              'A fully composable, and collaborative platform to boost your team velocity',
          })}
          customIcon={
            <CloudCustomWrapper src={cloudIconBackground}>
              <CloudIconWrapper>
                <img src={cloudIcon} alt="Strapi Cloud" />
              </CloudIconWrapper>
            </CloudCustomWrapper>
          }
          decorator={<CloudFlags src={cloudFlags} />}
        />
      </BlockLink>

      <BlockLink
        href="https://strapi.io/resource-center"
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => handleClick('didClickonReadTheDocumentationSection')}
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
        onClick={() => handleClick('didClickonCodeExampleSection')}
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
        onClick={() => handleClick('didClickonTutorialSection')}
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
        onClick={() => handleClick('didClickonBlogSection')}
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
    </Stack>
  );
};

export default ContentBlocks;
