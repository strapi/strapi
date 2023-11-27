import React from 'react';

import { Button, Flex, HeaderLayout } from '@strapi/design-system';
import { Link } from '@strapi/helper-plugin';
import { ArrowLeft, Check } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

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
  onErrorRegenerate,
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
          <Flex gap={2}>
            {canRegenerate && token?.id && (
              <Regenerate
                backUrl={regenerateUrl}
                onRegenerate={handleRegenerate}
                idToRegenerate={token?.id}
                onError={onErrorRegenerate}
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
          </Flex>
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
      ellipsis
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
  onErrorRegenerate: PropTypes.func,
};

FormHead.defaultProps = {
  token: undefined,
  onErrorRegenerate: undefined,
};

export default FormHead;
