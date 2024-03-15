import * as React from 'react';

import {
  Box,
  ContentLayout,
  FieldLabel,
  Flex,
  Grid,
  GridItem,
  Typography,
} from '@strapi/design-system';

import { Form, useField } from '../../../components/Form';
import { type RelationsFieldProps } from '../../pages/EditView/components/FormInputs/Relations';
import {
  InputRenderer,
  type InputRendererProps,
} from '../../pages/EditView/components/InputRenderer';
import { useHistoryContext } from '../pages/History';

/* -------------------------------------------------------------------------------------------------
 * CustomRelationInput
 * -----------------------------------------------------------------------------------------------*/

const CustomRelationInput = (props: RelationsFieldProps) => {
  const field = useField(props.name);

  return (
    <Box>
      <FieldLabel>{props.label}</FieldLabel>
      {field.value.results.length === 0 ? (
        <Typography>No content</Typography>
      ) : (
        <Flex direction="column" gap={2} alignItems="stretch">
          {(field.value.results as Record<string, unknown>[]).map((relationData, index) => {
            return (
              <Flex
                key={index}
                paddingTop={2}
                paddingBottom={2}
                paddingLeft={4}
                paddingRight={4}
                hasRadius
                borderColor="neutral200"
                background="neutral150"
                justifyContent="space-between"
              >
                <pre>
                  <Typography as="code">{JSON.stringify(relationData, null, 2)}</Typography>
                </pre>
              </Flex>
            );
          })}
          <Typography>{field.value.meta.missingCount} missing relations</Typography>
        </Flex>
      )}
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * CustomInputRenderer
 * -----------------------------------------------------------------------------------------------*/

// The renderers for these types will be added in future PRs, they need special handling
const UNSUPPORTED_TYPES = ['media'];

const CustomInputRenderer = (props: InputRendererProps) => {
  if (UNSUPPORTED_TYPES.includes(props.type)) {
    return <Typography>TODO: support {props.type}</Typography>;
  }

  if (props.type === 'relation') {
    return <CustomRelationInput {...props} />;
  }

  return <InputRenderer {...props} />;
};

/* -------------------------------------------------------------------------------------------------
 * VersionContent
 * -----------------------------------------------------------------------------------------------*/

const VersionContent = () => {
  const { version, layout } = useHistoryContext('VersionContent', (state) => ({
    version: state.selectedVersion,
    layout: state.layout,
  }));

  return (
    <ContentLayout>
      <Form disabled={true} method="PUT" initialValues={version.data}>
        <Flex direction="column" alignItems="stretch" gap={6} position="relative">
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
    </ContentLayout>
  );
};

export { VersionContent };
