import * as React from 'react';

import { Form, Layouts, useForm, createRulesEngine, useIsMobile } from '@strapi/admin/strapi-admin';
import { Box, Divider, Flex, Grid, Typography } from '@strapi/design-system';
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
import type { Schema } from '@strapi/types';

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
  const isMobile = useIsMobile();
  const fieldValues = useForm('Fields', (state) => state.values);
  const rulesEngine = createRulesEngine();
  if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
    const [row] = panel;
    const [field] = row;
    const condition = field.attribute?.conditions?.visible;

    if (condition) {
      const isVisible = rulesEngine.evaluate(condition, fieldValues);
      if (!isVisible) {
        return null; // Skip rendering the dynamic zone if the condition is not met
      }
    }

    return (
      <Grid.Root key={field.name} gap={4}>
        <Grid.Item xs={12} direction="column" alignItems="stretch">
          <VersionInputRenderer {...field} />
        </Grid.Item>
      </Grid.Root>
    );
  }

  return (
    <Box
      hasRadius={!isMobile}
      background={{ initial: 'transparent', medium: 'neutral0' }}
      shadow={{ initial: 'none', medium: 'tableShadow' }}
      padding={{ initial: 0, medium: 6 }}
      borderColor={{ initial: 'transparent', medium: 'neutral150' }}
    >
      <Flex direction="column" alignItems="stretch" gap={6}>
        {panel.map((row, gridRowIndex) => {
          const visibleFields = row.filter((field) => {
            const condition = field.attribute?.conditions?.visible;

            if (condition) {
              return rulesEngine.evaluate(condition, fieldValues);
            }

            return true;
          });

          if (visibleFields.length === 0) {
            return null; // Skip rendering the entire grid row
          }

          return (
            <Grid.Root key={gridRowIndex} gap={{ initial: 6, medium: 4 }}>
              {visibleFields.map(({ size, ...field }) => {
                return (
                  <Grid.Item
                    col={size}
                    key={field.name}
                    xs={12}
                    direction="column"
                    alignItems="stretch"
                  >
                    <VersionInputRenderer {...field} />
                  </Grid.Item>
                );
              })}
            </Grid.Root>
          );
        })}
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
      <Box paddingBottom={{ initial: 0, large: 8 }}>
        <Form key={version.id} disabled={true} method="PUT" initialValues={transformedData}>
          <Flex direction="column" alignItems="stretch" gap={6} position="relative">
            {[...layout, ...remainingFieldsLayout].map((panel, index) => {
              return <FormPanel key={index} panel={panel} />;
            })}
          </Flex>
        </Form>
        {removedAttributesAsFields.length > 0 && (
          <>
            <Box paddingTop={{ initial: 4, large: 0 }}>
              <Divider />
            </Box>
            <Box paddingTop={{ initial: 4, large: 8 }}>
              <Flex
                direction="column"
                alignItems="flex-start"
                paddingBottom={{ initial: 4, large: 6 }}
                gap={1}
              >
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
              <Form
                key={`${version.id}-unknownFields`}
                disabled={true}
                method="PUT"
                initialValues={version.data}
              >
                <Flex direction="column" alignItems="stretch" gap={6} position="relative">
                  {unknownFieldsLayout.map((panel, index) => {
                    return <FormPanel key={index} panel={panel} />;
                  })}
                </Flex>
              </Form>
            </Box>
          </>
        )}
      </Box>
    </Layouts.Content>
  );
};

export { VersionContent, getRemaingFieldsLayout };
