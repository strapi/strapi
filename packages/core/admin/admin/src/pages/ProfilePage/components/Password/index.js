import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  Typography,
  Box,
  Grid,
  GridItem,
  Flex,
  FieldAction,
  TextInput,
} from '@strapi/design-system';
import { Eye, EyeStriked } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { pxToRem } from '@strapi/helper-plugin';

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

// Wrapper of the Eye Icon able to show or hide the Password inside the field
const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: ${pxToRem(16)};
    width: ${pxToRem(16)};
    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

const Password = ({ errors, onChange, values }) => {
  const { formatMessage } = useIntl();
  const [currentPasswordShown, setCurrentPasswordShown] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);
  const [passwordConfirmShown, setPasswordConfirmShown] = useState(false);

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
            id: 'global.change-password',
            defaultMessage: 'Change password',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <TextInput
              error={
                errors.currentPassword
                  ? formatMessage({
                      id: errors.currentPassword,
                      defaultMessage: errors.currentPassword,
                    })
                  : ''
              }
              onChange={onChange}
              value={values.currentPassword}
              label={formatMessage({
                id: 'Auth.form.currentPassword.label',
                defaultMessage: 'Current Password',
              })}
              name="currentPassword"
              type={currentPasswordShown ? 'text' : 'password'}
              endAction={
                <FieldActionWrapper
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPasswordShown((prev) => !prev);
                  }}
                  label={formatMessage(
                    currentPasswordShown
                      ? {
                          id: 'Auth.form.password.show-password',
                          defaultMessage: 'Show password',
                        }
                      : {
                          id: 'Auth.form.password.hide-password',
                          defaultMessage: 'Hide password',
                        }
                  )}
                >
                  {currentPasswordShown ? <Eye /> : <EyeStriked />}
                </FieldActionWrapper>
              }
            />
          </GridItem>
        </Grid>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <PasswordInput
              error={
                errors.password
                  ? formatMessage({
                      id: errors.password,
                      defaultMessage: errors.password,
                    })
                  : ''
              }
              onChange={onChange}
              value={values.password}
              label={formatMessage({
                id: 'global.password',
                defaultMessage: 'Password',
              })}
              name="password"
              type={passwordShown ? 'text' : 'password'}
              autoComplete="new-password"
              endAction={
                <FieldActionWrapper
                  onClick={(e) => {
                    e.stopPropagation();
                    setPasswordShown((prev) => !prev);
                  }}
                  label={formatMessage(
                    passwordShown
                      ? {
                          id: 'Auth.form.password.show-password',
                          defaultMessage: 'Show password',
                        }
                      : {
                          id: 'Auth.form.password.hide-password',
                          defaultMessage: 'Hide password',
                        }
                  )}
                >
                  {passwordShown ? <Eye /> : <EyeStriked />}
                </FieldActionWrapper>
              }
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <PasswordInput
              error={
                errors.confirmPassword
                  ? formatMessage({
                      id: errors.confirmPassword,
                      defaultMessage: errors.confirmPassword,
                    })
                  : ''
              }
              onChange={onChange}
              value={values.confirmPassword}
              label={formatMessage({
                id: 'Auth.form.confirmPassword.label',
                defaultMessage: 'Password confirmation',
              })}
              name="confirmPassword"
              type={passwordConfirmShown ? 'text' : 'password'}
              autoComplete="new-password"
              endAction={
                <FieldActionWrapper
                  onClick={(e) => {
                    e.stopPropagation();
                    setPasswordConfirmShown((prev) => !prev);
                  }}
                  label={formatMessage(
                    passwordConfirmShown
                      ? {
                          id: 'Auth.form.password.show-password',
                          defaultMessage: 'Show password',
                        }
                      : {
                          id: 'Auth.form.password.hide-password',
                          defaultMessage: 'Hide password',
                        }
                  )}
                >
                  {passwordConfirmShown ? <Eye /> : <EyeStriked />}
                </FieldActionWrapper>
              }
            />
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

Password.propTypes = {
  errors: PropTypes.shape({
    currentPassword: PropTypes.string,
    password: PropTypes.string,
    confirmPassword: PropTypes.string,
  }),
  onChange: PropTypes.func,
  values: PropTypes.shape({
    currentPassword: PropTypes.string,
    password: PropTypes.string,
    confirmPassword: PropTypes.string,
  }),
};

Password.defaultProps = {
  errors: {},
  onChange() {},
  values: {
    currentPassword: '',
    password: '',
    confirmPassword: '',
  },
};

export default Password;
