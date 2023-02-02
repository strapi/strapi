import React from 'react';
import { useIntl } from 'react-intl';
import { usePersistentState } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Select, Option } from '@strapi/design-system/Select';
import { Stack } from '@strapi/design-system/Stack';
import { Textarea } from '@strapi/design-system/Textarea';
import { TextInput } from '@strapi/design-system/TextInput';
import { Typography } from '@strapi/design-system/Typography';
import { getDateOfExpiration } from '../../utils';

const FormTransferTokenContainer = ({
  errors,
  onChange,
  canEditInputs,
  isCreating,
  values,
  transferToken,
}) => {
  const { formatMessage } = useIntl();
  const [lang] = usePersistentState('strapi-admin-language', 'en');

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
                id: 'Settings.transferTokens.form.name',
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
                id: 'Settings.transferTokens.form.description',
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
                id: 'Settings.transferTokens.form.duration',
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
                  id: 'Settings.transferTokens.duration.7-days',
                  defaultMessage: '7 days',
                })}
              </Option>
              <Option value="2592000000">
                {formatMessage({
                  id: 'Settings.transferTokens.duration.30-days',
                  defaultMessage: '30 days',
                })}
              </Option>
              <Option value="7776000000">
                {formatMessage({
                  id: 'Settings.transferTokens.duration.90-days',
                  defaultMessage: '90 days',
                })}
              </Option>
              <Option value="0">
                {formatMessage({
                  id: 'Settings.transferTokens.duration.unlimited',
                  defaultMessage: 'Unlimited',
                })}
              </Option>
            </Select>
            <Typography variant="pi" textColor="neutral600">
              {!isCreating &&
                `${formatMessage({
                  id: 'Settings.transferTokens.duration.expiration-date',
                  defaultMessage: 'Expiration date',
                })}: ${getDateOfExpiration(
                  transferToken?.createdAt,
                  parseInt(values.lifespan, 10),
                  lang
                )}`}
            </Typography>
          </GridItem>
        </Grid>
      </Stack>
    </Box>
  );
};

FormTransferTokenContainer.propTypes = {
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
    lifespan: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
  }).isRequired,
  isCreating: PropTypes.bool.isRequired,
  transferToken: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    lifespan: PropTypes.string,
    name: PropTypes.string,
    accessKey: PropTypes.string,
    permissions: PropTypes.array,
    description: PropTypes.string,
    createdAt: PropTypes.string,
  }),
};

FormTransferTokenContainer.defaultProps = {
  errors: {},
  transferToken: {},
};

export default FormTransferTokenContainer;
