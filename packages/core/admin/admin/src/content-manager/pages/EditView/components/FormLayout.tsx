import { Box, Flex, Grid, GridItem } from '@strapi/design-system';

import { EditLayout } from '../../../hooks/useDocumentLayout';

import { InputRenderer } from './InputRenderer';

interface FormLayoutProps extends Pick<EditLayout, 'layout'> {}

const FormLayout = ({ layout }: FormLayoutProps) => {
  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      {layout.map((panel, index) => {
        if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
          const [row] = panel;
          const [field] = row;
          return (
            <Grid key={field.name} gap={4}>
              <GridItem col={12} s={12} xs={12}>
                <InputRenderer {...field} />
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
                        <InputRenderer {...field} />
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
  );
};

export { FormLayout, FormLayoutProps };
