import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/parts/Stack';
import ReadDoc from '@strapi/icons/ReadDoc';
import CodeExample from '@strapi/icons/CodeExample';
import Tutorial from '@strapi/icons/Tutorial';
import Blog from '@strapi/icons/Blog';
import { ContentBox } from '@strapi/helper-plugin';

const BlockLink = styled.a`
  text-decoration: none;
`;

const ContentBlocks = () => {
  const { formatMessage } = useIntl();

  return (
    <Stack size={5}>
      <BlockLink
        href="https://strapi.io/resource-center"
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.documentation',
            defaultMessage: 'Read the documentation',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.documentation.content',
            defaultMessage: 'Discover the concepts, reference, guides and tutorials',
          })}
          icon={<ReadDoc />}
          iconBackground="primary100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/starters"
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.code',
            defaultMessage: 'Code example',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.code.content',
            defaultMessage: 'Learn by testing real project developed by the community',
          })}
          icon={<CodeExample />}
          iconBackground="warning100"
        />
      </BlockLink>
      <BlockLink
        href="https://strapi.io/blog/categories/tutorials"
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.tutorial',
            defaultMessage: 'Tutorial',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.tutorial.content',
            defaultMessage: 'Discover the concepts, reference, guides and tutorials',
          })}
          icon={<Tutorial />}
          iconBackground="secondary100"
        />
      </BlockLink>
      <BlockLink href="https://strapi.io/blog" target="_blank" rel="noopener noreferrer nofollow">
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.blog',
            defaultMessage: 'Blog',
          })}
          subtitle={formatMessage({
            id: 'app.components.BlockLink.blog.content',
            defaultMessage: 'Discover the concepts, reference, guides and tutorials',
          })}
          icon={<Blog />}
          iconBackground="alternative100"
        />
      </BlockLink>
    </Stack>
  );
};

export default ContentBlocks;
