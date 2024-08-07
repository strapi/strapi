import { Box, Grid, Typography } from '@strapi/design-system';
import get from 'lodash/get';
import { useIntl } from 'react-intl';

import { GenericInput } from './GenericInputs';

interface TabFormProps {
  form: Array<Record<string, any>>;
  formErrors: Record<string, any>;
  genericInputProps: Record<string, any>;
  modifiedData: Record<string, any>;
  onChange: (value: any) => void;
}

/* eslint-disable react/no-array-index-key */
export const TabForm = ({
  form,
  formErrors,
  genericInputProps,
  modifiedData,
  onChange,
}: TabFormProps) => {
  const { formatMessage } = useIntl();

  return (
    <>
      {form.map((section, sectionIndex) => {
        // Don't display an empty section
        if (section.items.length === 0) {
          return null;
        }

        return (
          <Box key={sectionIndex}>
            {section.sectionTitle && (
              <Box paddingBottom={4}>
                <Typography variant="delta" tag="h3">
                  {formatMessage(section.sectionTitle)}
                </Typography>
              </Box>
            )}
            <Grid.Root gap={4}>
              {section.items.map((input: any, i: number) => {
                const key = `${sectionIndex}.${i}`;

                /**
                 * Use undefined as the default value because not every input wants a string e.g. Date pickers
                 */
                const value = get(modifiedData, input.name, undefined);

                // When extending the yup schema of an existing field (like in https://github.com/strapi/strapi/blob/293ff3b8f9559236609d123a2774e3be05ce8274/packages/strapi-plugin-i18n/admin/src/index.js#L52)
                // and triggering a yup validation error in the UI (missing a required field for example)
                // We got an object that looks like: formErrors = { "pluginOptions.i18n.localized": {...} }
                // In order to deal with this error, we can't rely on lodash.get to resolve this key
                // - lodash will try to access {pluginOptions: {i18n: {localized: true}}})
                // - and we just want to access { "pluginOptions.i18n.localized": {...} }
                // NOTE: this is a hack
                const pluginOptionError = Object.keys(formErrors).find((key) => key === input.name);

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
                          .filter((key: string) => key !== 'componentToCreate'),
                        'id',
                      ],
                      null
                    );

                if (input.type === 'pushRight') {
                  return (
                    <Grid.Item
                      col={input.size || 6}
                      key={input.name || key}
                      direction="column"
                      alignItems="stretch"
                    >
                      <div />
                    </Grid.Item>
                  );
                }

                return (
                  <Grid.Item
                    col={input.size || 6}
                    key={input.name || key}
                    direction="column"
                    alignItems="stretch"
                  >
                    <GenericInput
                      {...input}
                      {...genericInputProps}
                      error={errorId}
                      onChange={onChange}
                      value={value}
                    />
                  </Grid.Item>
                );
              })}
            </Grid.Root>
          </Box>
        );
      })}
    </>
  );
};
