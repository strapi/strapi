import React from 'react';
import styled from 'styled-components';
import { Stack } from '@strapi/parts/Stack';
import ReadDoc from '@strapi/icons/ReadDoc';
import CodeExample from '@strapi/icons/CodeExample';
import Tutorial from '@strapi/icons/Tutorial';
import Blog from '@strapi/icons/Blog';
import ContentBlock from './ContentBlock';

const BlockLink = styled.a`
  text-decoration: none;
`;

const ContentBlocks = () => {
  return (
    <Stack size={5}>
      <BlockLink href="https://strapi.io/blog">
        <ContentBlock
          title="Read the documentation"
          subtitle="Discover the concepts, reference, guides and tutorials"
          icon={<ReadDoc />}
          iconBackground="primary100"
        />
      </BlockLink>
      <BlockLink href="https://strapi.io/blog">
        <ContentBlock
          title="Code example"
          subtitle="Learn by testing real project developed by the community"
          icon={<CodeExample />}
          iconBackground="warning100"
        />
      </BlockLink>
      <BlockLink href="https://strapi.io/blog">
        <ContentBlock
          title="Tutorial"
          subtitle="Discover the concepts, reference, guides and tutorials"
          icon={<Tutorial />}
          iconBackground="secondary100"
        />
      </BlockLink>
      <BlockLink href="https://strapi.io/blog">
        <ContentBlock
          title="Blog"
          subtitle="Discover the concepts, reference, guides and tutorials"
          icon={<Blog />}
          iconBackground="alternative100"
        />
      </BlockLink>
    </Stack>
  );
};

export default ContentBlocks;
