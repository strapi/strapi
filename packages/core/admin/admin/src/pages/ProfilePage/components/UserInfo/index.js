import React from 'react';

import { Box, Flex, Grid, GridItem, Typography } from '@strapi/design-system';
import { GenericInput } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const UserInfo = ({ errors, onChange, values }) => {
  const { formatMessage } = useIntl();

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
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: 'global.profile',
            defaultMessage: 'Profile',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{
                id: 'Auth.form.firstname.label',
                defaultMessage: 'First name',
              }}
              error={errors.firstname}
              onChange={onChange}
              value={values.firstname}
              type="text"
              name="firstname"
              required
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{
                id: 'Auth.form.lastname.label',
                defaultMessage: 'Last name',
              }}
              error={errors.lastname}
              onChange={onChange}
              value={values.lastname}
              type="text"
              name="lastname"
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{ id: 'Auth.form.email.label', defaultMessage: 'Email' }}
              error={errors.email}
              onChange={onChange}
              value={values.email}
              type="email"
              name="email"
              required
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{
                id: 'Auth.form.username.label',
                defaultMessage: 'Username',
              }}
              error={errors.username}
              onChange={onChange}
              value={values.username}
              type="text"
              name="username"
            />
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

UserInfo.propTypes = {
  errors: PropTypes.shape({
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    username: PropTypes.string,
    email: PropTypes.string,
  }),
  onChange: PropTypes.func,
  values: PropTypes.shape({
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    username: PropTypes.string,
    email: PropTypes.string,
  }),
};

UserInfo.defaultProps = {
  errors: {},
  onChange() {},
  values: {
    firstname: '',
    lastname: '',
    username: '',
    email: '',
  },
};

export default UserInfo;
