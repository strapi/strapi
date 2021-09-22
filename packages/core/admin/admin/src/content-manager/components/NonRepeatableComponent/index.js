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

const NonRepeatableComponent = ({
  componentUid,
  // TODO
  // isFromDynamicZone,
  name,
}) => {
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
                      componentUid={componentUid}
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

  // return (
  //   <NonRepeatableWrapper isFromDynamicZone={isFromDynamicZone}>
  //     {fields.map((fieldRow, key) => {
  //       return (
  //         <div className="row" key={key}>
  //           {fieldRow.map(({ name: fieldName, size, metadatas, fieldSchema, queryInfos }) => {
  //             const isComponent = fieldSchema.type === 'component';
  //             const keys = `${name}.${fieldName}`;

  //             if (isComponent) {
  //               const compoUid = fieldSchema.component;

  //               return (
  //                 <FieldComponent
  //                   key={fieldName}
  //                   componentUid={compoUid}
  //                   isRepeatable={fieldSchema.repeatable}
  //                   label={metadatas.label}
  //                   max={fieldSchema.max}
  //                   min={fieldSchema.min}
  //                   name={keys}
  //                 />
  //               );
  //             }

  //             return (
  //               <div key={fieldName} className={`col-${size}`}>
  //                 <Inputs
  //                   keys={keys}
  //                   fieldSchema={fieldSchema}
  //                   metadatas={metadatas}
  //                   componentUid={componentUid}
  //                   queryInfos={queryInfos}
  //                 />
  //               </div>
  //             );
  //           })}
  //         </div>
  //       );
  //     })}
  //   </NonRepeatableWrapper>
  // );
};

NonRepeatableComponent.defaultProps = {
  // isFromDynamicZone: false,
};

NonRepeatableComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  // isFromDynamicZone: PropTypes.bool,
  name: PropTypes.string.isRequired,
};

export default NonRepeatableComponent;
