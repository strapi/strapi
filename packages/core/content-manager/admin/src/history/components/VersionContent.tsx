import * as React from 'react';

import { Form, Layouts, createRulesEngine, useForm, useIsMobile } from '@strapi/admin/strapi-admin';
import { Box, Divider, Flex, Grid, Typography } from '@strapi/design-system';
import pipe from 'lodash/fp/pipe';
import { useIntl } from 'react-intl';

import { useDoc } from '../../hooks/useDocument';
import { useTypedSelector } from '../../modules/hooks';
import {
  prepareTempKeys,
  removeFieldsThatDontExistOnSchema,
} from '../../pages/EditView/utils/data';
import {
  getConditionDependencyPaths,
  getConditionDependencySubscriptionValue,
} from '../../utils/conditionalFields';
import { useHistoryContext } from '../HistoryContext';
import { getRemaingFieldsLayout } from '../utils/versionLayoutUtils';

import { VersionInputRenderer } from './VersionInputRenderer';

import type { ComponentsDictionary, Document } from '../../hooks/useDocument';
import type { EditFieldLayout } from '../../hooks/useDocumentLayout';
import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * FormPanel
 * -----------------------------------------------------------------------------------------------*/

// Reuse one rules engine instance instead of creating a new one on every render.
const rulesEngine = createRulesEngine();

const getPanelConditionDependencyPaths = (panel: EditFieldLayout[][]): string[] | null => {
  // Aggregate condition dependencies across all fields in the panel so we can subscribe narrowly.
  const dependencies = new Set<string>();

  for (const row of panel) {
    for (const field of row) {
      const condition = field.attribute?.conditions?.visible;

      if (!condition) {
        continue;
      }

      const paths = getConditionDependencyPaths(condition);

      if (paths === null) {
        return null;
      }

      for (const path of paths) {
        dependencies.add(path);
      }
    }
  }

  return [...dependencies].sort();
};

const FormPanel = ({ panel }: { panel: EditFieldLayout[][] }) => {
  const isMobile = useIsMobile();
  const conditionDependencyPaths = React.useMemo(
    () => getPanelConditionDependencyPaths(panel),
    [panel]
  );
  const getValues = useForm(
    'FormPanel',
    (state) => (state as typeof state & { getValues: () => unknown }).getValues
  );
  const conditionSubscriptionValue = useForm('FormPanel', (state) => {
    return getConditionDependencySubscriptionValue(state.values, conditionDependencyPaths);
  });
  // For narrow subscriptions, read the latest full values lazily via getValues() to evaluate rules.
  // This avoids rerendering for unrelated form changes while preserving correct condition evaluation.
  const fieldValues = conditionDependencyPaths === null ? conditionSubscriptionValue : getValues();

  const isFieldVisible = React.useCallback(
    (field: EditFieldLayout) => {
      const condition = field.attribute?.conditions?.visible;

      if (!condition) {
        return true;
      }

      return rulesEngine.evaluate(condition, fieldValues);
    },
    [fieldValues]
  );

  if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
    const [row] = panel;
    const [field] = row;

    if (!isFieldVisible(field)) {
      return null;
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
          const visibleFields = row.filter(isFieldVisible);

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

export { VersionContent };
