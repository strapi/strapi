import React from 'react';
import { useIntl } from 'react-intl';
import { Link } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Check from '@strapi/icons/Check';
import { Button } from '@strapi/design-system/Button';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { Stack } from '@strapi/design-system/Stack';
import Regenerate from '../Regenerate';

const FormHead = ({
  transferToken,
  setTransferToken,
  canEditInputs,
  canRegenerate,
  isSubmitting,
}) => {
  const { formatMessage } = useIntl();

  const handleRegenerate = (newKey) => {
    setTransferToken({
      ...transferToken,
      accessKey: newKey,
    });
  };

  return (
    <HeaderLayout
      title={
        transferToken?.name ||
        formatMessage({
          id: 'Settings.transferToken.createPage.title',
          defaultMessage: 'Create Transfer Token',
        })
      }
      primaryAction={
        canEditInputs ? (
          <Stack horizontal spacing={2}>
            {canRegenerate && transferToken?.id && (
              <Regenerate onRegenerate={handleRegenerate} idToRegenerate={transferToken?.id} />
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
          transferToken?.id && (
            <Regenerate onRegenerate={handleRegenerate} idToRegenerate={transferToken?.id} />
          )
        )
      }
      navigationAction={
        <Link startIcon={<ArrowLeft />} to="/settings/transfer-tokens">
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
  transferToken: PropTypes.shape({
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
  setTransferToken: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
};

FormHead.defaultProps = {
  transferToken: undefined,
};

export default FormHead;
