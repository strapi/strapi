/**
 *
 * TabForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { GenericInput } from '@strapi/helper-plugin';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { H3 } from '@strapi/parts/Text';

/* eslint-disable react/no-array-index-key */
const TabForm = ({ form, formErrors, genericInputProps, modifiedData, onChange }) => {
  const { formatMessage } = useIntl();

  return form.map((section, sectionIndex) => {
    // Don't display an empty section
    if (section.items.length === 0) {
      return null;
    }

    return (
      <Box key={sectionIndex}>
        {section.sectionTitle && (
          <Box paddingBottom={4}>
            <H3>{formatMessage(section.sectionTitle)}</H3>
          </Box>
        )}
        <Grid gap={4}>
          {section.items.map((input, i) => {
            const key = `${sectionIndex}.${i}`;

            const retrievedValue = get(modifiedData, input.name, '');

            let value;

            if (input.name === 'enum' && Array.isArray(retrievedValue)) {
              value = retrievedValue.join('\n');
            } else if (input.name === 'uid') {
              value = input.value;
            } else if (input.name === 'allowedTypes' && retrievedValue === '') {
              value = null;
            } else {
              value = retrievedValue;
            }

            // When extending the yup schema of an existing field (like in https://github.com/strapi/strapi/blob/293ff3b8f9559236609d123a2774e3be05ce8274/packages/strapi-plugin-i18n/admin/src/index.js#L52)
            // and triggering a yup validation error in the UI (missing a required field for example)
            // We got an object that looks like: formErrors = { "pluginOptions.i18n.localized": {...} }
            // In order to deal with this error, we can't rely on lodash.get to resolve this key
            // - lodash will try to access {pluginOptions: {i18n: {localized: true}}})
            // - and we just want to access { "pluginOptions.i18n.localized": {...} }
            // NOTE: this is a hack
            const pluginOptionError = Object.keys(formErrors).find(key => key === input.name);

            // Retrieve the error for a specific input
            const errorId = pluginOptionError
              ? formErrors[pluginOptionError].id
              : get(
                  formErrors,
                  [
                    ...input.name
                      .split('.')
                      // The filter here is used when creating a component
                      // in the component step 1 modal
                      // Since the component info is stored in the
                      // componentToCreate object we can access the error
                      // By removing the key
                      .filter(key => key !== 'componentToCreate'),
                    'id',
                  ],
                  null
                );

            if (input.type === 'pushRight') {
              return (
                <GridItem col={input.size || 6} key={input.name || key}>
                  <div />
                </GridItem>
              );
            }

            return (
              <GridItem col={input.size || 6} key={input.name || key}>
                <GenericInput
                  {...input}
                  {...genericInputProps}
                  error={errorId}
                  onChange={onChange}
                  value={value}
                />
              </GridItem>
            );
          })}
        </Grid>
      </Box>
    );
  });
};

TabForm.propTypes = {
  form: PropTypes.arrayOf(PropTypes.object).isRequired,
  formErrors: PropTypes.object.isRequired,
  genericInputProps: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TabForm;
