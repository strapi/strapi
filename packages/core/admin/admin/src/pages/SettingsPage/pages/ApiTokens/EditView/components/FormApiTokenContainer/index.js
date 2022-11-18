import React from 'react';
import { useIntl } from 'react-intl';
import { usePersistentState } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  GridItem,
  Select,
  Option,
  Stack,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { getDateOfExpiration } from '../../utils';

const FormApiTokenContainer = ({
  errors,
  onChange,
  canEditInputs,
  isCreating,
  values,
  apiToken,
  onDispatch,
  setHasChangedPermissions,
}) => {
  const { formatMessage } = useIntl();
  const [lang] = usePersistentState('strapi-admin-language', 'en');

  const handleChangeSelectApiTokenType = ({ target: { value } }) => {
    setHasChangedPermissions(false);

    if (value === 'full-access') {
      onDispatch({
        type: 'SELECT_ALL_ACTIONS',
      });
    }
    if (value === 'read-only') {
      onDispatch({
        type: 'ON_CHANGE_READ_ONLY',
      });
    }
  };

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
      <Stack spacing={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: 'global.details',
            defaultMessage: 'Details',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem key="name" col={6} xs={12}>
            <TextInput
              name="name"
              error={
                errors.name
                  ? formatMessage(
                      errors.name?.id
                        ? errors.name
                        : { id: errors.name, defaultMessage: errors.name }
                    )
                  : null
              }
              label={formatMessage({
                id: 'Settings.apiTokens.form.name',
                defaultMessage: 'Name',
              })}
              onChange={onChange}
              value={values.name}
              disabled={!canEditInputs}
              required
            />
          </GridItem>
          <GridItem key="description" col={6} xs={12}>
            <Textarea
              label={formatMessage({
                id: 'Settings.apiTokens.form.description',
                defaultMessage: 'Description',
              })}
              name="description"
              error={
                errors.description
                  ? formatMessage(
                      errors.description?.id
                        ? errors.description
                        : {
                            id: errors.description,
                            defaultMessage: errors.description,
                          }
                    )
                  : null
              }
              onChange={onChange}
              disabled={!canEditInputs}
            >
              {values.description}
            </Textarea>
          </GridItem>
          <GridItem key="lifespan" col={6} xs={12}>
            <Select
              name="lifespan"
              label={formatMessage({
                id: 'Settings.apiTokens.form.duration',
                defaultMessage: 'Token duration',
              })}
              value={values.lifespan !== null ? values.lifespan : '0'}
              error={
                errors.lifespan
                  ? formatMessage(
                      errors.lifespan?.id
                        ? errors.lifespan
                        : { id: errors.lifespan, defaultMessage: errors.lifespan }
                    )
                  : null
              }
              onChange={(value) => {
                onChange({ target: { name: 'lifespan', value } });
              }}
              required
              disabled={!isCreating}
              placeholder="Select"
            >
              <Option value="604800000">
                {formatMessage({
                  id: 'Settings.apiTokens.duration.7-days',
                  defaultMessage: '7 days',
                })}
              </Option>
              <Option value="2592000000">
                {formatMessage({
                  id: 'Settings.apiTokens.duration.30-days',
                  defaultMessage: '30 days',
                })}
              </Option>
              <Option value="7776000000">
                {formatMessage({
                  id: 'Settings.apiTokens.duration.90-days',
                  defaultMessage: '90 days',
                })}
              </Option>
              <Option value="0">
                {formatMessage({
                  id: 'Settings.apiTokens.duration.unlimited',
                  defaultMessage: 'Unlimited',
                })}
              </Option>
            </Select>
            <Typography variant="pi" textColor="neutral600">
              {!isCreating &&
                `${formatMessage({
                  id: 'Settings.apiTokens.duration.expiration-date',
                  defaultMessage: 'Expiration date',
                })}: ${getDateOfExpiration(
                  apiToken?.createdAt,
                  parseInt(values.lifespan, 10),
                  lang
                )}`}
            </Typography>
          </GridItem>

          <GridItem key="type" col={6} xs={12}>
            <Select
              name="type"
              label={formatMessage({
                id: 'Settings.apiTokens.form.type',
                defaultMessage: 'Token type',
              })}
              value={values?.type}
              error={
                errors.type
                  ? formatMessage(
                      errors.type?.id
                        ? errors.type
                        : { id: errors.type, defaultMessage: errors.type }
                    )
                  : null
              }
              onChange={(value) => {
                handleChangeSelectApiTokenType({ target: { value } });
                onChange({ target: { name: 'type', value } });
              }}
              placeholder="Select"
              required
              disabled={!canEditInputs}
            >
              <Option value="read-only">
                {formatMessage({
                  id: 'Settings.apiTokens.types.read-only',
                  defaultMessage: 'Read-only',
                })}
              </Option>
              <Option value="full-access">
                {formatMessage({
                  id: 'Settings.apiTokens.types.full-access',
                  defaultMessage: 'Full access',
                })}
              </Option>
              <Option value="custom">
                {formatMessage({
                  id: 'Settings.apiTokens.types.custom',
                  defaultMessage: 'Custom',
                })}
              </Option>
            </Select>
          </GridItem>
        </Grid>
      </Stack>
    </Box>
  );
};

FormApiTokenContainer.propTypes = {
  errors: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    lifespan: PropTypes.string,
    type: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  canEditInputs: PropTypes.bool.isRequired,
  values: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    lifespan: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  isCreating: PropTypes.bool.isRequired,
  apiToken: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    lifespan: PropTypes.number,
    name: PropTypes.string,
    accessKey: PropTypes.string,
    permissions: PropTypes.array,
    description: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  onDispatch: PropTypes.func.isRequired,
  setHasChangedPermissions: PropTypes.func.isRequired,
};

FormApiTokenContainer.defaultProps = {
  errors: {},
  apiToken: {},
};

export default FormApiTokenContainer;
