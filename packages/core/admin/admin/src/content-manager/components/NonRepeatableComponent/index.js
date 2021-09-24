/* eslint-disable react/no-array-index-key */
/* eslint-disable import/no-cycle */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Stack } from '@strapi/parts/Stack';
import { useContentTypeLayout } from '../../hooks';
import FieldComponent from '../FieldComponent';
import Inputs from '../Inputs';

const NonRepeatableComponent = ({ componentUid, name }) => {
  const { getComponentLayout } = useContentTypeLayout();
  const componentLayoutData = useMemo(() => getComponentLayout(componentUid), [
    componentUid,
    getComponentLayout,
  ]);
  const fields = componentLayoutData.layouts.edit;

  return (
    <Box background="neutral100" paddingLeft={6} paddingRight={6} paddingTop={6} paddingBottom={6}>
      <Stack size={6}>
        {fields.map((fieldRow, key) => {
          return (
            <Grid gap={4} key={key}>
              {fieldRow.map(({ name: fieldName, size, metadatas, fieldSchema, queryInfos }) => {
                const isComponent = fieldSchema.type === 'component';
                const keys = `${name}.${fieldName}`;

                if (isComponent) {
                  const compoUid = fieldSchema.component;

                  return (
                    <GridItem col={size} s={12} xs={12} key={fieldName}>
                      <FieldComponent
                        componentUid={compoUid}
                        intlLabel={{
                          id: metadatas.label,
                          defaultMessage: metadatas.label,
                        }}
                        isRepeatable={fieldSchema.repeatable}
                        max={fieldSchema.max}
                        min={fieldSchema.min}
                        name={keys}
                      />
                    </GridItem>
                  );
                }

                return (
                  <GridItem col={size} key={fieldName} s={12} xs={12}>
                    <Inputs
                      keys={keys}
                      fieldSchema={fieldSchema}
                      metadatas={metadatas}
                      queryInfos={queryInfos}
                    />
                  </GridItem>
                );
              })}
            </Grid>
          );
        })}
      </Stack>
    </Box>
  );
};

NonRepeatableComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default NonRepeatableComponent;
