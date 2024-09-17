import * as React from 'react';

import { Form, Layouts } from '@strapi/admin/strapi-admin';
import { Box, Divider, Flex, Grid, Typography } from '@strapi/design-system';
import { Schema } from '@strapi/types';
import pipe from 'lodash/fp/pipe';
import { useIntl } from 'react-intl';

import { useDoc } from '../../hooks/useDocument';
import { useTypedSelector } from '../../modules/hooks';
import {
  prepareTempKeys,
  removeFieldsThatDontExistOnSchema,
} from '../../pages/EditView/utils/data';
import { HistoryContextValue, useHistoryContext } from '../pages/History';

import { VersionInputRenderer } from './VersionInputRenderer';

import type { Metadatas } from '../../../../shared/contracts/content-types';
import type { GetInitData } from '../../../../shared/contracts/init';
import type { ComponentsDictionary, Document } from '../../hooks/useDocument';
import type { EditFieldLayout } from '../../hooks/useDocumentLayout';

const createLayoutFromFields = <T extends EditFieldLayout | UnknownField>(fields: T[]) => {
  return (
    fields
      .reduce<Array<T[]>>((rows, field) => {
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
      .map((row) => [row])
  );
};

/* -------------------------------------------------------------------------------------------------
 * getRemainingFieldsLayout
 * -----------------------------------------------------------------------------------------------*/

interface GetRemainingFieldsLayoutOptions
  extends Pick<HistoryContextValue, 'layout'>,
    Pick<GetInitData.Response['data'], 'fieldSizes'> {
  schemaAttributes: HistoryContextValue['schema']['attributes'];
  metadatas: Metadatas;
}

/**
 * Build a layout for the fields that are were deleted from the edit view layout
 * via the configure the view page. This layout will be merged with the main one.
 * Those fields would be restored if the user restores the history version, which is why it's
 * important to show them, even if they're not in the normal layout.
 */
function getRemaingFieldsLayout({
  layout,
  metadatas,
  schemaAttributes,
  fieldSizes,
}: GetRemainingFieldsLayoutOptions) {
  const fieldsInLayout = layout.flatMap((panel) =>
    panel.flatMap((row) => row.flatMap((field) => field.name))
  );
  const remainingFields = Object.entries(metadatas).reduce<EditFieldLayout[]>(
    (currentRemainingFields, [name, field]) => {
      // Make sure we do not fields that are not visible, e.g. "id"
      if (!fieldsInLayout.includes(name) && field.edit.visible === true) {
        const attribute = schemaAttributes[name];
        // @ts-expect-error not sure why attribute causes type error
        currentRemainingFields.push({
          attribute,
          type: attribute.type,
          visible: true,
          disabled: true,
          label: field.edit.label || name,
          name: name,
          size: fieldSizes[attribute.type].default ?? 12,
        });
      }

      return currentRemainingFields;
    },
    []
  );

  return createLayoutFromFields(remainingFields);
}

/* -------------------------------------------------------------------------------------------------
 * FormPanel
 * -----------------------------------------------------------------------------------------------*/

const FormPanel = ({ panel }: { panel: EditFieldLayout[][] }) => {
  if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
    const [row] = panel;
    const [field] = row;

    return (
      <Grid.Root key={field.name} gap={4}>
        <Grid.Item col={12} s={12} xs={12} direction="column" alignItems="stretch">
          <VersionInputRenderer {...field} />
        </Grid.Item>
      </Grid.Root>
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
          <Grid.Root key={gridRowIndex} gap={4}>
            {row.map(({ size, ...field }) => {
              return (
                <Grid.Item
                  col={size}
                  key={field.name}
                  s={12}
                  xs={12}
                  direction="column"
                  alignItems="stretch"
                >
                  <VersionInputRenderer {...field} />
                </Grid.Item>
              );
            })}
          </Grid.Root>
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
  const version = useHistoryContext('VersionContent', (state) => state.selectedVersion);
  const layout = useHistoryContext('VersionContent', (state) => state.layout);
  const configuration = useHistoryContext('VersionContent', (state) => state.configuration);
  const schema = useHistoryContext('VersionContent', (state) => state.schema);

  // Build a layout for the unknown fields section
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
  const unknownFieldsLayout = createLayoutFromFields(removedAttributesAsFields);

  // Build a layout for the fields that are were deleted from the layout
  const remainingFieldsLayout = getRemaingFieldsLayout({
    metadatas: configuration.contentType.metadatas,
    layout,
    schemaAttributes: schema.attributes,
    fieldSizes,
  });

  const { components } = useDoc();

  /**
   * Transform the data before passing it to the form so that each field
   * has a uniquely generated key
   */
  const transformedData = React.useMemo(() => {
    const transform =
      (schemaAttributes: Schema.Attributes, components: ComponentsDictionary = {}) =>
      (document: Omit<Document, 'id'>) => {
        const schema = { attributes: schemaAttributes };
        const transformations = pipe(
          removeFieldsThatDontExistOnSchema(schema),
          prepareTempKeys(schema, components)
        );
        return transformations(document);
      };

    return transform(version.schema, components)(version.data);
  }, [components, version.data, version.schema]);

  return (
    <Layouts.Content>
      <Box paddingBottom={8}>
        <Form disabled={true} method="PUT" initialValues={transformedData}>
          <Flex direction="column" alignItems="stretch" gap={6} position="relative">
            {[...layout, ...remainingFieldsLayout].map((panel, index) => {
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
    </Layouts.Content>
  );
};

export { VersionContent, getRemaingFieldsLayout };
