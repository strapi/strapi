import React from 'react';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Text } from '@strapi/parts/Text';
import { Textarea } from '@strapi/parts/Textarea';
import { TextInput } from '@strapi/parts/TextInput';
import { Button } from '@strapi/parts/Button';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const RoleForm = ({ disabled, role, values, errors, onChange, onBlur }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
        <Stack size={4}>
          <Row justifyContent="space-between">
            <Box>
              <Box>
                <Text bold>
                  {role
                    ? role.name
                    : formatMessage({
                        id: 'Settings.roles.form.title',
                        defaultMessage: 'Details',
                      })}
                </Text>
              </Box>
              <Box>
                <Text textColor="neutral500" small>
                  {role
                    ? role.description
                    : formatMessage({
                        id: 'Settings.roles.form.description',
                        defaultMessage: 'Name and description of the role',
                      })}
                </Text>
              </Box>
            </Box>
            <Button disabled variant="secondary">
              {formatMessage(
                {
                  id: 'Settings.roles.form.button.users-with-role',
                  defaultMessage:
                    '{number, plural, =0 {# users} one {# user} other {# users}} with this role',
                },
                { number: role.usersCount }
              )}
            </Button>
          </Row>
          <Grid gap={4}>
            <GridItem col={6}>
              <TextInput
                disabled={disabled}
                name="name"
                error={errors.name && formatMessage({ id: errors.name })}
                label={formatMessage({
                  id: 'Settings.roles.form.input.name',
                  defaultMessage: 'Name',
                })}
                onChange={onChange}
                onBlur={onBlur}
                value={values.name || ''}
              />
            </GridItem>
            <GridItem col={6}>
              <Textarea
                disabled={disabled}
                label={formatMessage({
                  id: 'Settings.roles.form.input.description',
                  defaultMessage: 'Description',
                })}
                name="description"
                error={errors.name && formatMessage({ id: errors.name })}
                onChange={onChange}
                onBlur={onBlur}
              >
                {values.description || ''}
              </Textarea>
            </GridItem>
          </Grid>
        </Stack>
      </Box>
    </>
  );
};

RoleForm.defaultProps = {
  disabled: false,
  role: null,
  values: { name: '', description: '' },
};
RoleForm.propTypes = {
  disabled: PropTypes.bool,
  errors: PropTypes.object.isRequired,
  onBlur: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  role: PropTypes.object,
  values: PropTypes.object,
};

export default RoleForm;
