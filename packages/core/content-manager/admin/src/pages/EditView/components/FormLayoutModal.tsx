/*
This one is a copy of the FormLayout component.
But instead of using the useDoc to retrieve the data from the url we use the
useRelationModalContext to get the current relation model. It is used inside the Relation on the fly modal.
*/
import { Box, Flex, Grid } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { EditLayout } from '../../../hooks/useDocumentLayout';

import { useRelationModalContext } from './FormInputs/Relations/RelationModal';
import { InputRendererModal } from './InputRendererModal';

export const RESPONSIVE_CONTAINER_BREAKPOINTS = {
  sm: '27.5rem', // 440px
};

export const ResponsiveGridRoot = styled(Grid.Root)`
  container-type: inline-size;
`;

// We need to use a different grid item for the responsive layout in the test environment
// because @container is not supported in jsdom and it throws an error
export const ResponsiveGridItem =
  process.env.NODE_ENV !== 'test'
    ? styled(Grid.Item)<{ col: number }>`
        grid-column: span 12;
        @container (min-width: ${RESPONSIVE_CONTAINER_BREAKPOINTS.sm}) {
          ${({ col }) => col && `grid-column: span ${col};`}
        }
      `
    : styled(Grid.Item)<{ col: number }>`
        grid-column: span 12;
      `;

interface FormLayoutModalProps extends Pick<EditLayout, 'layout'> {
  hasBackground?: boolean;
}

const FormLayoutModal = ({ layout, hasBackground = true }: FormLayoutModalProps) => {
  const { formatMessage } = useIntl();
  const model = useRelationModalContext('RelationModal', (state) => state.currentRelation.model);

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
                <InputRendererModal {...fieldWithTranslatedLabel} />
              </Grid.Item>
            </Grid.Root>
          );
        }

        return (
          <Box
            key={index}
            {...(hasBackground && {
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
                        <InputRendererModal {...fieldWithTranslatedLabel} />
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

export { FormLayoutModal, FormLayoutModalProps };
