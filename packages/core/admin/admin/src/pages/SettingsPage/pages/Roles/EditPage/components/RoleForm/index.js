import React from 'react';

import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const RoleForm = ({ disabled, role, values, errors, onChange, onBlur }) => {
  const { formatMessage } = useIntl();

  return (
    <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex justifyContent="space-between">
          <Box>
            <Box>
              <Typography fontWeight="bold">
                {role
                  ? role.name
                  : formatMessage({
                      id: 'global.details',
                      defaultMessage: 'Details',
                    })}
              </Typography>
            </Box>
            <Box>
              <Typography textColor="neutral500" variant="pi">
                {role
                  ? role.description
                  : formatMessage({
                      id: 'Settings.roles.form.description',
                      defaultMessage: 'Name and description of the role',
                    })}
              </Typography>
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
        </Flex>
        <Grid gap={4}>
          <GridItem col={6}>
            <TextInput
              disabled={disabled}
              name="name"
              error={errors.name && formatMessage({ id: errors.name })}
              label={formatMessage({
                id: 'global.name',
                defaultMessage: 'Name',
              })}
              onChange={onChange}
              onBlur={onBlur}
              required
              value={values.name || ''}
            />
          </GridItem>
          <GridItem col={6}>
            <Textarea
              disabled={disabled}
              label={formatMessage({
                id: 'global.description',
                defaultMessage: 'Description',
              })}
              id="description"
              error={errors.name && formatMessage({ id: errors.name })}
              onChange={onChange}
              onBlur={onBlur}
            >
              {values.description || ''}
            </Textarea>
          </GridItem>
        </Grid>
      </Flex>
    </Box>
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
