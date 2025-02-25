import { Box, Flex, Grid } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useDoc } from '../../../hooks/useDocument';
import { EditLayout } from '../../../hooks/useDocumentLayout';

import { InputRenderer } from './InputRenderer';

export const RESPONSIVE_CONTAINER_BREAKPOINTS = {
  sm: '27.5rem', // 440px
};

export const ResponsiveGridRoot = styled(Grid.Root)`
  container-type: inline-size;
`;

export const ResponsiveGridItem = styled(Grid.Item)`
  grid-column: span 12;

  @container (min-width: ${RESPONSIVE_CONTAINER_BREAKPOINTS.sm}) {
    ${({ col }) => col && `grid-column: span ${col};`}
  }
`;

interface FormLayoutProps extends Pick<EditLayout, 'layout'> {
  hasBackground?: boolean;
}

const FormLayout = ({ layout, hasBackground = false }: FormLayoutProps) => {
  const { formatMessage } = useIntl();
  const { model } = useDoc();

  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      {layout.map((panel, index) => {
        if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
          const [row] = panel;
          const [field] = row;

          const fieldWithTranslatedLabel = {
            ...field,
            label: formatMessage({
              id: `content-manager.content-types.${model}.${field.name}`,
              defaultMessage: field.label,
            }),
          };

          return (
            <Grid.Root key={field.name} gap={4}>
              <Grid.Item col={12} s={12} xs={12} direction="column" alignItems="stretch">
                <InputRenderer {...fieldWithTranslatedLabel} />
              </Grid.Item>
            </Grid.Root>
          );
        }

        return (
          <Box
            key={index}
            {...(!hasBackground && {
              padding: 6,
              borderColor: 'neutral150',
              background: 'neutral0',
              hasRadius: true,
              shadow: 'tableShadow',
            })}
          >
            <Flex direction="column" alignItems="stretch" gap={6}>
              {panel.map((row, gridRowIndex) => (
                <ResponsiveGridRoot key={gridRowIndex} gap={4}>
                  {row.map(({ size, ...field }) => {
                    const fieldWithTranslatedLabel = {
                      ...field,
                      label: formatMessage({
                        id: `content-manager.content-types.${model}.${field.name}`,
                        defaultMessage: field.label,
                      }),
                    };
                    return (
                      <ResponsiveGridItem
                        col={size}
                        key={field.name}
                        s={12}
                        xs={12}
                        direction="column"
                        alignItems="stretch"
                      >
                        <InputRenderer {...fieldWithTranslatedLabel} />
                      </ResponsiveGridItem>
                    );
                  })}
                </ResponsiveGridRoot>
              ))}
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
};

export { FormLayout, FormLayoutProps };
