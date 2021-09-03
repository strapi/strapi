import { Box, Grid, GridItem, Row, Stack, Text, Textarea, TextInput } from '@strapi/parts';
import { PropTypes } from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

const UsersRoleNumber = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  background: ${({ theme }) => theme.colors.primary100};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  color: ${({ theme }) => theme.colors.primary600};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${12 / 16}rem;
  font-weight: bold;
`;

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
            <UsersRoleNumber>
              {formatMessage(
                {
                  id: 'Settings.roles.form.button.users-with-role',
                  defaultMessage:
                    '{number, plural, =0 {# users} one {# user} other {# users}} with this role',
                },
                { number: role.usersCount }
              )}
            </UsersRoleNumber>
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
