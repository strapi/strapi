import * as React from 'react';

import { Form } from '@strapi/admin/strapi-admin';
import {
  Box,
  ContentLayout,
  Divider,
  Flex,
  Grid,
  GridItem,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useTypedSelector } from '../../modules/hooks';
import { useHistoryContext } from '../pages/History';

import { VersionInputRenderer } from './VersionInputRenderer';

import type { EditFieldLayout } from '../../hooks/useDocumentLayout';

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
          <VersionInputRenderer {...field} />
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
                  <VersionInputRenderer {...field} />
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

type UnknownField = EditFieldLayout & { shouldIgnoreRBAC: boolean };
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
      const field = {
        attribute,
        shouldIgnoreRBAC: true,
        type: attribute.type,
        visible: true,
        disabled: true,
        label: attributeName,
        name: attributeName,
        size: fieldSizes[attribute.type].default ?? 12,
      } as UnknownField;

      return field;
    }
  );
  const unknownFieldsLayout = removedAttributesAsFields
    .reduce<Array<UnknownField[]>>((rows, field) => {
      if (field.type === 'dynamiczone') {
        // Dynamic zones take up all the columns in a row
        rows.push([field]);

        return rows;
      }

      if (!rows[rows.length - 1]) {
        // Create a new row if there isn't one available
        rows.push([]);
      }

      // Push fields to the current row, they wrap and handle their own column size
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
