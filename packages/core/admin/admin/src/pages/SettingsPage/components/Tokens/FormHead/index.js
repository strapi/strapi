import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Link } from '@strapi/helper-plugin';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Check from '@strapi/icons/Check';
import { Button } from '@strapi/design-system/Button';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { Stack } from '@strapi/design-system/Stack';
import Regenerate from '../Regenerate';

const FormHead = ({
  title,
  token,
  setToken,
  canEditInputs,
  canRegenerate,
  isSubmitting,
  backUrl,
  regenerateUrl,
}) => {
  const { formatMessage } = useIntl();
  const handleRegenerate = (newKey) => {
    setToken({
      ...token,
      accessKey: newKey,
    });
  };

  return (
    <HeaderLayout
      title={token?.name || formatMessage(title)}
      primaryAction={
        canEditInputs ? (
          <Stack horizontal spacing={2}>
            {canRegenerate && token?.id && (
              <Regenerate
                backUrl={regenerateUrl}
                onRegenerate={handleRegenerate}
                idToRegenerate={token?.id}
              />
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
          token?.id && (
            <Regenerate
              onRegenerate={handleRegenerate}
              idToRegenerate={token?.id}
              backUrl={regenerateUrl}
            />
          )
        )
      }
      navigationAction={
        <Link startIcon={<ArrowLeft />} to={backUrl}>
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
  token: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    lifespan: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    accessKey: PropTypes.string,
    permissions: PropTypes.array,
    description: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  canEditInputs: PropTypes.bool.isRequired,
  canRegenerate: PropTypes.bool.isRequired,
  setToken: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  backUrl: PropTypes.string.isRequired,
  title: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
  }).isRequired,
  regenerateUrl: PropTypes.string.isRequired,
};

FormHead.defaultProps = {
  token: undefined,
};

export default FormHead;
