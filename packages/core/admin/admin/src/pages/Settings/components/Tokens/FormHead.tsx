import * as React from 'react';

import { Button, Flex, HeaderLayout } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { ArrowLeft, Check, Refresh } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useRegenerate } from '../../hooks/useRegenerate';

import type { Entity } from '@strapi/types';

interface RegenerateProps {
  onRegenerate?: (newKey: string) => void;
  idToRegenerate: Entity.ID;
  backUrl: string;
  onError?: (err: unknown) => void;
}

const Regenerate = ({
  onRegenerate = () => {},
  idToRegenerate,
  backUrl,
  onError,
}: RegenerateProps) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const { regenerateData, isLoadingConfirmation } = useRegenerate(
    backUrl,
    idToRegenerate,
    onRegenerate,
    onError
  );
  const handleConfirmRegeneration = async () => {
    regenerateData();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Button
        startIcon={<Refresh />}
        type="button"
        size="S"
        variant="tertiary"
        onClick={() => setShowConfirmDialog(true)}
        name="regenerate"
      >
        {formatMessage({
          id: 'Settings.tokens.regenerate',
          defaultMessage: 'Regenerate',
        })}
      </Button>

      <ConfirmDialog
        bodyText={{
          id: 'Settings.tokens.popUpWarning.message',
          defaultMessage: 'Are you sure you want to regenerate this token?',
        }}
        iconRightButton={<Refresh />}
        isConfirmButtonLoading={isLoadingConfirmation}
        isOpen={showConfirmDialog}
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRegeneration}
        leftButtonText={{
          id: 'Settings.tokens.Button.cancel',
          defaultMessage: 'Cancel',
        }}
        rightButtonText={{
          id: 'Settings.tokens.Button.regenerate',
          defaultMessage: 'Regenerate',
        }}
        title={{
          id: 'Settings.tokens.RegenerateDialog.title',
          defaultMessage: 'Regenerate token',
        }}
      />
    </>
  );
};

interface Token {
  id: Entity.ID;
  name: string;
}

interface FormHeadProps<TToken extends Token | null> {
  title: MessageDescriptor;
  token: TToken;
  canEditInputs: boolean;
  canRegenerate: boolean;
  setToken: (token: TToken) => void;
  isSubmitting: boolean;
  backUrl: string;
  regenerateUrl: string;
  onErrorRegenerate?: (err: unknown) => void;
}

export const FormHead = <TToken extends Token | null>({
  title,
  token,
  setToken,
  canEditInputs,
  canRegenerate,
  isSubmitting,
  backUrl,
  regenerateUrl,
  onErrorRegenerate,
}: FormHeadProps<TToken>) => {
  const { formatMessage } = useIntl();
  const handleRegenerate = (newKey: string) => {
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
        <>
          {/* @ts-expect-error polymorphic */}
          <Link as={NavLink} startIcon={<ArrowLeft />} to={backUrl}>
            {formatMessage({
              id: 'global.back',
              defaultMessage: 'Back',
            })}
          </Link>
        </>
      }
      ellipsis
    />
  );
};
