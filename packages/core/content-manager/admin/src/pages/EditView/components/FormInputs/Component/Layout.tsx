import * as React from 'react';

import { Grid, GridItem } from '@strapi/design-system';

import { type EditFieldLayout } from '../../../../../hooks/useDocumentLayout';
import { InputRenderer, type InputRendererProps } from '../../InputRenderer';

interface ComponentLayoutProps {
  layout: EditFieldLayout[][];
  name: string;
  renderInput?: (props: InputRendererProps) => React.ReactNode;
}

const ComponentLayout = ({ layout, name, renderInput = InputRenderer }: ComponentLayoutProps) => {
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
                  {renderInput({ ...field, name: completeFieldName })}
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
