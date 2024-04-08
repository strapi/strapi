import * as React from 'react';

import { Form } from '@strapi/admin/strapi-admin';
import {
  Alert,
  Box,
  ContentLayout,
  Divider,
  FieldLabel,
  Flex,
  Grid,
  GridItem,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useTypedSelector } from '../../modules/hooks';
import {
  InputRenderer,
  type InputRendererProps,
} from '../../pages/EditView/components/InputRenderer';
import { useHistoryContext } from '../pages/History';

import type { EditFieldLayout } from '../../hooks/useDocumentLayout';

/* -------------------------------------------------------------------------------------------------
 * CustomInputRenderer
 * -----------------------------------------------------------------------------------------------*/
const StyledAlert = styled(Alert)`
  button {
    display: none;
  }
`;

// The renderers for these types will be added in future PRs, they need special handling
const UNSUPPORTED_TYPES = ['media', 'relation'];

const CustomInputRenderer = (props: InputRendererProps) => {
  const { formatMessage } = useIntl();
  const { version } = useHistoryContext('VersionContent', (state) => ({
    version: state.selectedVersion,
  }));

  if (UNSUPPORTED_TYPES.includes(props.type)) {
    return <Typography>TODO: support {props.type}</Typography>;
  }

  // Handle new fields
  const addedAttributes = version.meta.unknownAttributes.added;
  if (Object.keys(addedAttributes).includes(props.name)) {
    return (
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <FieldLabel>{props.label}</FieldLabel>
        <StyledAlert
          width="100%"
          closeLabel="Close"
          onClose={() => {}}
          variant="warning"
          title={formatMessage({
            id: 'content-manager.history.content.new-field.title',
            defaultMessage: 'New field',
          })}
        >
          {formatMessage({
            id: 'content-manager.history.content.new-field.message',
            defaultMessage:
              "This field didn't exist when this version was saved. If you restore this version, it will be empty.",
          })}
        </StyledAlert>
      </Flex>
    );
  }

  return <InputRenderer {...props} />;
};

/* -------------------------------------------------------------------------------------------------
 * FormPanel
 * -----------------------------------------------------------------------------------------------*/

const FormPanel = ({ panel }: { panel: EditFieldLayout[][] }) => {
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
};

/* -------------------------------------------------------------------------------------------------
 * VersionContent
 * -----------------------------------------------------------------------------------------------*/
type UnknownFieldLayout = EditFieldLayout & { isRBACDisabled: boolean };
const VersionContent = () => {
  const { formatMessage } = useIntl();
  const { fieldSizes } = useTypedSelector((state) => state['content-manager'].app);
  const { version, layout } = useHistoryContext('VersionContent', (state) => ({
    version: state.selectedVersion,
    layout: state.layout,
  }));

  const removedAttributes = version.meta.unknownAttributes.removed;
  const removedAttributesAsFields = Object.entries(removedAttributes).map(
    ([attributeName, attribute]) => {
      return {
        attribute,
        type: attribute.type,
        // TODO: Find a better way to render inputs without RBAC?
        isRBACDisabled: true,
        visible: true,
        disabled: true,
        label: attributeName,
        name: attributeName,
        size: fieldSizes[attribute.type].default ?? 12,
      };
    }
  );
  const unknownFieldsLayout = removedAttributesAsFields
    .reduce<Array<UnknownFieldLayout[]>>((rows, field) => {
      if (field.type === 'dynamiczone') {
        // Dynamic zones take up an entire row
        // @ts-expect-error Fix the type error
        rows.push([field]);

        return rows;
      }

      if (!rows[rows.length - 1]) {
        // Create a new row if there isn't one available
        rows.push([]);
      }

      // Push fields to the current row
      // @ts-expect-error Fix the type error
      rows[rows.length - 1].push(field);

      return rows;
    }, [])
    // Map the rows to panels
    .map((row) => [row]);

  return (
    <ContentLayout>
      <Box paddingBottom={8}>
        <Form disabled={true} method="PUT" initialValues={version.data}>
          <Flex direction="column" alignItems="stretch" gap={6} position="relative">
            {layout.map((panel, index) => {
              return <FormPanel key={index} panel={panel} />;
            })}
          </Flex>
        </Form>
      </Box>
      {removedAttributesAsFields.length > 0 && (
        <>
          <Divider />
          <Box paddingTop={8}>
            <Flex direction="column" alignItems="flex-start" paddingBottom={6} gap={1}>
              <Typography variant="delta">
                {formatMessage({
                  id: 'content-manager.history.content.unknown-fields.title',
                  defaultMessage: 'Unknown fields',
                })}
              </Typography>
              <Typography variant="pi">
                {formatMessage(
                  {
                    id: 'content-manager.history.content.unknown-fields.message',
                    defaultMessage:
                      'These fields have been deleted or renamed in the Content-Type Builder. <b>These fields will not be restored.</b>',
                  },
                  {
                    b: (chunks: React.ReactNode) => (
                      <Typography variant="pi" fontWeight="bold">
                        {chunks}
                      </Typography>
                    ),
                  }
                )}
              </Typography>
            </Flex>
            <Form disabled={true} method="PUT" initialValues={version.data}>
              <Flex direction="column" alignItems="stretch" gap={6} position="relative">
                {unknownFieldsLayout.map((panel, index) => {
                  return <FormPanel key={index} panel={panel} />;
                })}
              </Flex>
            </Form>
          </Box>
        </>
      )}
    </ContentLayout>
  );
};

export { VersionContent };
