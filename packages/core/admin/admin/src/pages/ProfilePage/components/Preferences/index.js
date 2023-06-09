import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box, Grid, GridItem, Flex, Select, Option } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';

const Preferences = ({ onChange, values, localeNames, allApplicationThemes }) => {
  const { formatMessage } = useIntl();
  const themesToDisplay = Object.keys(allApplicationThemes).filter(
    (themeName) => allApplicationThemes[themeName]
  );

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="delta" as="h2">
            {formatMessage({
              id: 'Settings.profile.form.section.experience.title',
              defaultMessage: 'Experience',
            })}
          </Typography>
          <Typography>
            {formatMessage(
              {
                id: 'Settings.profile.form.section.experience.interfaceLanguageHelp',
                defaultMessage:
                  'Preference changes will apply only to you. More information is available {here}.',
              },
              {
                here: (
                  <Box
                    as="a"
                    color="primary600"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#locales"
                  >
                    {formatMessage({
                      id: 'Settings.profile.form.section.experience.here',
                      defaultMessage: 'here',
                    })}
                  </Box>
                ),
              }
            )}
          </Typography>
        </Flex>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <Select
              label={formatMessage({
                id: 'Settings.profile.form.section.experience.interfaceLanguage',
                defaultMessage: 'Interface language',
              })}
              placeholder={formatMessage({
                id: 'global.select',
                defaultMessage: 'Select',
              })}
              hint={formatMessage({
                id: 'Settings.profile.form.section.experience.interfaceLanguage.hint',
                defaultMessage: 'This will only display your own interface in the chosen language.',
              })}
              onClear={() => {
                onChange({
                  target: { name: 'preferedLanguage', value: null },
                });
              }}
              clearLabel={formatMessage({
                id: 'Settings.profile.form.section.experience.clear.select',
                defaultMessage: 'Clear the interface language selected',
              })}
              value={values.preferedLanguage}
              onChange={(e) => {
                onChange({
                  target: { name: 'preferedLanguage', value: e },
                });
              }}
            >
              {Object.entries(localeNames).map(([language, langName]) => (
                <Option value={language} key={language}>
                  {langName}
                </Option>
              ))}
            </Select>
          </GridItem>
          <GridItem s={12} col={6}>
            <Select
              label={formatMessage({
                id: 'Settings.profile.form.section.experience.mode.label',
                defaultMessage: 'Interface mode',
              })}
              placeholder={formatMessage({
                id: 'components.Select.placeholder',
                defaultMessage: 'Select',
              })}
              hint={formatMessage({
                id: 'Settings.profile.form.section.experience.mode.hint',
                defaultMessage: 'Displays your interface in the chosen mode.',
              })}
              value={values.currentTheme}
              onChange={(e) => {
                onChange({
                  target: { name: 'currentTheme', value: e },
                });
              }}
            >
              {themesToDisplay.map((theme) => (
                <Option value={theme} key={theme}>
                  {formatMessage(
                    {
                      id: 'Settings.profile.form.section.experience.mode.option-label',
                      defaultMessage: '{name} mode',
                    },
                    {
                      name: formatMessage({
                        id: theme,
                        defaultMessage: upperFirst(theme),
                      }),
                    }
                  )}
                </Option>
              ))}
            </Select>
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

Preferences.propTypes = {
  allApplicationThemes: PropTypes.object,
  onChange: PropTypes.func,
  values: PropTypes.shape({
    preferedLanguage: PropTypes.string,
    currentTheme: PropTypes.string,
  }),
  localeNames: PropTypes.object,
};

Preferences.defaultProps = {
  allApplicationThemes: {},
  onChange() {},
  values: {
    preferedLanguage: null,
    currentTheme: '',
  },
  localeNames: {},
};

export default Preferences;
