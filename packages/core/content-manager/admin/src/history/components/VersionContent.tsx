import * as React from 'react';

import { Form, useField, useStrapiApp } from '@strapi/admin/strapi-admin';
import {
  Box,
  ContentLayout,
  FieldLabel,
  Flex,
  Grid,
  GridItem,
  Typography,
} from '@strapi/design-system';

import {
  InputRenderer,
  type InputRendererProps,
} from '../../pages/EditView/components/InputRenderer';
import { useHistoryContext } from '../pages/History';

import type { RelationsFieldProps } from '../../pages/EditView/components/FormInputs/Relations';

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
 * CustomMediaInput
 * -----------------------------------------------------------------------------------------------*/

const CustomMediaInput = (props: InputRendererProps) => {
  const field = useField(props.name);
  const fields = useStrapiApp('CustomMediaInput', (state) => state.fields);
  const MediaLibrary = fields.media as React.ComponentType<
    InputRendererProps & { multiple: boolean }
  >;

  return (
    <Box>
      <Flex direction="column" gap={2} alignItems="stretch">
        <Form method="PUT" disabled={true} initialValues={{ [props.name]: field.value.results }}>
          <MediaLibrary {...props} disabled={true} multiple={field.value.results.length > 1} />
        </Form>
        <Typography>{field.value.meta.missingCount} missing relations</Typography>
      </Flex>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * CustomInputRenderer
 * -----------------------------------------------------------------------------------------------*/

const CustomInputRenderer = (props: InputRendererProps) => {
  switch (props.type) {
    case 'media':
      return <CustomMediaInput {...props} />;
    case 'relation':
      return <CustomRelationInput {...props} />;
    default:
      return <InputRenderer {...props} />;
  }
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
