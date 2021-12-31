import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/design-system/Stack';
import InformationSquare from '@strapi/icons/InformationSquare';
import CodeSquare from '@strapi/icons/CodeSquare';
import PlaySquare from '@strapi/icons/PlaySquare';
import FeatherSquare from '@strapi/icons/FeatherSquare';
import { ContentBox } from '@strapi/helper-plugin';

const BlockLink = styled.a`
  text-decoration: none;
`;

const ContentBlocks = () => {
  const { formatMessage } = useIntl();

  return (
    <Stack size={5}>
      <BlockLink
        href="/plugin/wiki"
      >
        <ContentBox
          title={formatMessage({
            id: 'app.components.BlockLink.documentation',
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
    </Stack>
  );
};

export default ContentBlocks;
