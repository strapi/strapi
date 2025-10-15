import * as React from 'react';

import { useForm, createRulesEngine } from '@strapi/admin/strapi-admin';
import { Box, BoxProps, Flex, Grid } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { EditLayout } from '../../../hooks/useDocumentLayout';

import { InputRenderer } from './InputRenderer';

import type { UseDocument } from '../../../hooks/useDocument';

export const ResponsiveGridRoot = styled(Grid.Root)`
  container-type: inline-size;
`;

export const ResponsiveGridItem =
  /**
   * TODO:
   * JSDOM cannot handle container queries.
   * This is a temporary workaround so that tests do not fail in the CI when jestdom throws an error
   * for failing to parse the stylesheet.
   */
  process.env.NODE_ENV !== 'test'
    ? styled(Grid.Item)<{ col: number }>`
        grid-column: span 12;
        ${({ theme }) => theme.breakpoints.medium} {
          ${({ col }) => col && `grid-column: span ${col};`}
        }
      `
    : styled(Grid.Item)<{ col: number }>`
        grid-column: span 12;
      `;

const panelStyles = {
  padding: {
    initial: 4,
    medium: 6,
  },
  borderColor: 'neutral150',
  background: 'neutral0',
  hasRadius: true,
  shadow: 'tableShadow',
} satisfies BoxProps;

interface FormLayoutProps extends Pick<EditLayout, 'layout'> {
  hasBackground?: boolean;
  document: ReturnType<UseDocument>;
}

const FormLayout = ({ layout, document, hasBackground = true }: FormLayoutProps) => {
  const { formatMessage } = useIntl();
  const modelUid = document.schema?.uid;
  const fieldValues = useForm('Fields', (state) => state.values);
  const rulesEngine = createRulesEngine();

  const getLabel = (name: string, label: string) => {
    return formatMessage({
      id: `content-manager.content-types.${modelUid}.${name}`,
      defaultMessage: label,
    });
  };

  // Compute a masked copy of values that excludes fields that are hidden, so
  // dependent fields don't evaluate against stale values. We do NOT mutate the
  // form state to avoid toggling the modified flag.
  const maskedValues = React.useMemo(() => {
    const schema = document.schema;
    if (!schema) return fieldValues;

    const hidden = new Set<string>();
    // First pass: determine hidden fields at the top level
    for (const [name, attr] of Object.entries(schema.attributes ?? {})) {
      const condition = (attr as any)?.conditions?.visible;
      if (condition) {
        const isVisible = rulesEngine.evaluate(condition, fieldValues);
        if (!isVisible) hidden.add(name);
      }
    }

    if (hidden.size === 0) return fieldValues;

    const copy: Record<string, unknown> = { ...fieldValues };
    for (const key of hidden) {
      if (key in copy) delete (copy as any)[key];
    }
    return copy;
  }, [document.schema, fieldValues, rulesEngine]);

  return (
    <Flex
      direction="column"
      alignItems="stretch"
      gap={{
        initial: 4,
        large: 6,
      }}
    >
      {layout.map((panel, index) => {
        if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
          const [row] = panel;
          const [field] = row;
          const attribute = document.schema?.attributes[field.name];
          const condition = attribute?.conditions?.visible;

          if (condition) {
            const isVisible = rulesEngine.evaluate(condition, maskedValues);
            if (!isVisible) {
              return null; // Skip rendering the dynamic zone if the condition is not met
            }
          }

          return (
            <Grid.Root key={field.name} gap={4}>
              <Grid.Item col={12} s={12} xs={12} direction="column" alignItems="stretch">
                <InputRenderer
                  {...field}
                  label={getLabel(field.name, field.label)}
                  document={document}
                />
              </Grid.Item>
            </Grid.Root>
          );
        }

        return (
          <Box key={index} {...(hasBackground && panelStyles)}>
            <Flex
              direction="column"
              alignItems="stretch"
              gap={{
                initial: 4,
                large: 6,
              }}
            >
              {panel.map((row, gridRowIndex) => {
                const visibleFields = row.filter(({ name }) => {
                  const attribute = document.schema?.attributes[name];
                  const condition = attribute?.conditions?.visible;

                  if (condition) {
                    return rulesEngine.evaluate(condition, maskedValues);
                  }

                  return true;
                });

                if (visibleFields.length === 0) {
                  return null; // Skip rendering the entire grid row
                }

                return (
                  <ResponsiveGridRoot key={gridRowIndex} gap={4}>
                    {visibleFields.map(({ size, ...field }) => {
                      return (
                        <ResponsiveGridItem
                          col={size}
                          key={field.name}
                          s={12}
                          xs={12}
                          direction="column"
                          alignItems="stretch"
                        >
                          <InputRenderer
                            {...field}
                            label={getLabel(field.name, field.label)}
                            document={document}
                          />
                        </ResponsiveGridItem>
                      );
                    })}
                  </ResponsiveGridRoot>
                );
              })}
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
};

export { FormLayout, FormLayoutProps };
