import React from 'react';
import { useIntl } from 'react-intl';
import { Link } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Check from '@strapi/icons/Check';
import { Button, HeaderLayout, Stack } from '@strapi/design-system';
import Regenerate from '../Regenerate';

const FormHead = ({ apiToken, setApiToken, canEditInputs, canRegenerate, isSubmitting }) => {
  const { formatMessage } = useIntl();
  const handleRegenerate = (newKey) => {
    setApiToken({
      ...apiToken,
      accessKey: newKey,
    });
  };

  return (
    <HeaderLayout
      title={
        apiToken?.name ||
        formatMessage({
          id: 'Settings.apiTokens.createPage.title',
          defaultMessage: 'Create API Token',
        })
      }
      primaryAction={
        canEditInputs ? (
          <Stack horizontal spacing={2}>
            {canRegenerate && apiToken?.id && (
              <Regenerate onRegenerate={handleRegenerate} idToRegenerate={apiToken?.id} />
            )}
            <Button
              disabled={isSubmitting}
              loading={isSubmitting}
              startIcon={<Check />}
              type="submit"
              size="S"
            >
              {formatMessage({
                id: 'global.save',
                defaultMessage: 'Save',
              })}
            </Button>
          </Stack>
        ) : (
          canRegenerate &&
          apiToken?.id && (
            <Regenerate onRegenerate={handleRegenerate} idToRegenerate={apiToken?.id} />
          )
        )
      }
      navigationAction={
        <Link startIcon={<ArrowLeft />} to="/settings/api-tokens">
          {formatMessage({
            id: 'global.back',
            defaultMessage: 'Back',
          })}
        </Link>
      }
    />
  );
};

FormHead.propTypes = {
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
  canEditInputs: PropTypes.bool.isRequired,
  canRegenerate: PropTypes.bool.isRequired,
  setApiToken: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
};

FormHead.defaultProps = {
  apiToken: undefined,
};

export default FormHead;
