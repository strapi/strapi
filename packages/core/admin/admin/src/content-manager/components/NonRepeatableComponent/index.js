/* eslint-disable react/no-array-index-key */
/* eslint-disable import/no-cycle */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, GridItem, Flex } from '@strapi/design-system';
import { useContentTypeLayout } from '../../hooks';
import FieldComponent from '../FieldComponent';
import Inputs from '../Inputs';
import useLazyComponents from '../../hooks/useLazyComponents';

const NonRepeatableComponent = ({ componentUid, isFromDynamicZone, isNested, name }) => {
  const { getComponentLayout } = useContentTypeLayout();
  const componentLayoutData = useMemo(
    () => getComponentLayout(componentUid),
    [componentUid, getComponentLayout]
  );
  const fields = componentLayoutData.layouts.edit;

  const { lazyComponentStore } = useLazyComponents();

  return (
    <Box
      background={isFromDynamicZone ? '' : 'neutral100'}
      paddingLeft={6}
      paddingRight={6}
      paddingTop={6}
      paddingBottom={6}
      hasRadius={isNested}
      borderColor={isNested ? 'neutral200' : ''}
    >
      <Flex direction="column" alignItems="stretch" gap={6}>
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
                        isNested
                        isRepeatable={fieldSchema.repeatable}
                        max={fieldSchema.max}
                        min={fieldSchema.min}
                        name={keys}
                        required={fieldSchema.required || false}
                      />
                    </GridItem>
                  );
                }

                return (
                  <GridItem col={size} key={fieldName} s={12} xs={12}>
                    <Inputs
                      componentUid={componentUid}
                      keys={keys}
                      fieldSchema={fieldSchema}
                      metadatas={metadatas}
                      queryInfos={queryInfos}
                      size={size}
                      customFieldInputs={lazyComponentStore}
                    />
                  </GridItem>
                );
              })}
            </Grid>
          );
        })}
      </Flex>
    </Box>
  );
};

NonRepeatableComponent.defaultProps = {
  isFromDynamicZone: false,
  isNested: false,
};

NonRepeatableComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  isFromDynamicZone: PropTypes.bool,
  isNested: PropTypes.bool,
  name: PropTypes.string.isRequired,
};

export default NonRepeatableComponent;
