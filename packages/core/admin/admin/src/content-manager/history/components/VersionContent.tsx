import * as React from 'react';

import { Box, ContentLayout, Flex, Grid, GridItem, Typography } from '@strapi/design-system';
import { type Permission } from '@strapi/helper-plugin';

import { Form } from '../../components/Form';
import { DocumentRBAC } from '../../features/DocumentRBAC';
import {
  InputRenderer,
  type InputRendererProps,
} from '../../pages/EditView/components/InputRenderer';
import { useHistoryContext } from '../pages/History';

/* -------------------------------------------------------------------------------------------------
 * CustomInputRenderer
 * -----------------------------------------------------------------------------------------------*/

// The renderers for these types will be added in future PRs, they need special handling
const UNSUPPORTED_TYPES = ['media', 'relation'];

const CustomInputRenderer = (props: InputRendererProps) => {
  if (UNSUPPORTED_TYPES.includes(props.type)) {
    return <Typography>TODO: support {props.type}</Typography>;
  }

  return <InputRenderer {...props} />;
};

/* -------------------------------------------------------------------------------------------------
 * VersionContent
 * -----------------------------------------------------------------------------------------------*/

interface VersionContentProps {
  permissions: Permission[];
}

const VersionContent = ({ permissions }: VersionContentProps) => {
  const { version, layout } = useHistoryContext('VersionContent', (state) => ({
    version: state.selectedVersion,
    layout: state.layout,
  }));

  return (
    <ContentLayout>
      <DocumentRBAC permissions={permissions}>
        <Form disabled={true} method="PUT" initialValues={version.data}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            {layout.map((panel, index) => {
              if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
                const [row] = panel;
                const [field] = row;
                return (
                  <Grid key={field.name} gap={4}>
                    <GridItem col={12} s={12} xs={12}>
                      <CustomInputRenderer {...field} />
                    </GridItem>
                  </Grid>
                );
              }

              return (
                <Box
                  key={index}
                  hasRadius
                  background="neutral0"
                  shadow="tableShadow"
                  paddingLeft={6}
                  paddingRight={6}
                  paddingTop={6}
                  paddingBottom={6}
                  borderColor="neutral150"
                >
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    {panel.map((row, gridRowIndex) => (
                      <Grid key={gridRowIndex} gap={4}>
                        {row.map(({ size, ...field }) => {
                          return (
                            <GridItem col={size} key={field.name} s={12} xs={12}>
                              <CustomInputRenderer {...field} />
                            </GridItem>
                          );
                        })}
                      </Grid>
                    ))}
                  </Flex>
                </Box>
              );
            })}
          </Flex>
        </Form>
      </DocumentRBAC>
    </ContentLayout>
  );
};

export { VersionContent };
