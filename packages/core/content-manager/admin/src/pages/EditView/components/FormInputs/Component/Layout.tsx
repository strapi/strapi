import * as React from 'react';

import { Grid, GridItem } from '@strapi/design-system';

import { type EditFieldLayout } from '../../../../../hooks/useDocumentLayout';
import { type InputRendererProps } from '../../InputRenderer';

interface ComponentLayoutProps {
  layout: EditFieldLayout[][];
  name: string;
  children: (props: InputRendererProps) => React.ReactNode;
}

const ComponentLayout = ({ layout, name, children }: ComponentLayoutProps) => {
  return (
    <>
      {layout.map((row, index) => {
        return (
          <Grid gap={4} key={index}>
            {row.map(({ size, ...field }) => {
              /**
               * Layouts are built from schemas so they don't understand the complete
               * schema tree, for components we append the parent name to the field name
               * because this is the structure for the data & permissions also understand
               * the nesting involved.
               */
              const completeFieldName = `${name}.${field.name}`;

              return (
                <GridItem col={size} key={completeFieldName} s={12} xs={12}>
                  {children({ ...field, name: completeFieldName })}
                </GridItem>
              );
            })}
          </Grid>
        );
      })}
    </>
  );
};

export type { ComponentLayoutProps };
export { ComponentLayout };
