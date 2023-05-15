/* eslint-disable react/prop-types */

import * as React from 'react';
import { HeaderLayout, ContentLayout, Flex, Box, Grid, GridItem } from '@strapi/design-system';

function Header({ title, subtitle, navigationAction, primaryAction }) {
  return (
    <HeaderLayout
      navigationAction={navigationAction}
      primaryAction={primaryAction}
      title={title}
      subtitle={subtitle}
    />
  );
}

function Root({ children, triggerContainer }) {
  return (
    <ContentLayout>
      <Flex direction="column" alignItems="stretch" gap={4}>
        {triggerContainer}
        <Box background="neutral0" padding={8} shadow="filterShadow" hasRadius>
          <Flex direction="column" alignItems="stretch" gap={6}>
            {children}
          </Flex>
        </Box>
      </Flex>
    </ContentLayout>
  );
}

function Fields({ name, url }) {
  return (
    <Grid gap={6}>
      <GridItem col={6}>{name}</GridItem>
      <GridItem col={12}>{url}</GridItem>
    </Grid>
  );
}

export { Header, Root, Fields };
