import * as React from 'react';

import { Button, Flex, VisuallyHidden } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { DocumentActionComponent } from '../../../../core/apis/content-manager';
import { useForm } from '../../../components/Form';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc } from '../../../hooks/useDocument';
import { useDocumentActions } from '../../../hooks/useDocumentActions';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionDescription {
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  icon?: React.ReactNode;
  /**
   * @default false
   */
  disabled?: boolean;
  /**
   * @default 'panel'
   * @description Where the action should be rendered.
   */
  position?: 'panel' | 'header';
  dialog?: DialogOptions | NotificationOptions | ModalOptions;
}

interface DialogOptions {
  type: 'dialog';
  title: string;
  content?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NotificationOptions {
  type: 'notifcation';
  title: string;
  link?: {
    label: string;
    url: string;
    target?: string;
  };
  content?: string;
  onClose?: () => void;
  status?: 'info' | 'warning' | 'softWarning' | 'success';
  timeout?: number;
}

interface ModalOptions {
  type: 'modal';
  title: string;
  content: React.ReactNode;
  footer: React.ReactNode;
  onClose?: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * DocumentActions
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionsProps {
  actions: DocumentActionDescription[];
}

const DocumentActions = ({ actions }: DocumentActionsProps) => {
  const { formatMessage } = useIntl();

  const [primaryAction, secondaryAction, ...restActions] = actions.filter(
    (action) => action.position !== 'header'
  );

  if (!primaryAction) {
    return null;
  }

  return (
    <Flex direction="column" gap={2} alignItems="stretch" width="100%">
      <Flex gap={2}>
        <Button
          flex={1}
          startIcon={primaryAction.icon}
          disabled={primaryAction.disabled}
          onClick={primaryAction.onClick}
          justifyContent="center"
        >
          {primaryAction.label}
        </Button>
        {restActions.length > 0 ? (
          <Menu.Root>
            <Menu.Trigger
              size="S"
              endIcon={null}
              paddingTop="7px"
              paddingLeft="9px"
              paddingRight="9px"
              variant="secondary"
            >
              <More aria-hidden focusable={false} />
              <VisuallyHidden as="span">
                {formatMessage({
                  id: 'content-manager.containers.edit.panels.default.more-actions',
                  defaultMessage: 'More actions',
                })}
              </VisuallyHidden>
            </Menu.Trigger>
          </Menu.Root>
        ) : null}
      </Flex>
      {secondaryAction ? (
        <Button
          startIcon={secondaryAction.icon}
          disabled={secondaryAction.disabled}
          onClick={secondaryAction.onClick}
          justifyContent="center"
          variant="secondary"
        >
          {secondaryAction.label}
        </Button>
      ) : null}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionComponents
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: DocumentActionComponent = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const canPublish = useDocumentRBAC('PublishAction', (state) => state.canPublish);
  const { model, collectionType, id } = useDoc();
  const { publish } = useDocumentActions();
  const isSubmitting = useForm('PublishAction', ({ isSubmitting }) => isSubmitting);

  return {
    disabled: !canPublish || isSubmitting,
    label: formatMessage({
      id: 'app.utils.publish',
      defaultMessage: 'Publish',
    }),
    onClick: async () => {
      if (id) {
        const res = await publish({
          collectionType,
          model,
          id,
        });

        if ('data' in res) {
          navigate({ search: `?state=published` });
        }
      }
    },
  };
};

PublishAction.type = 'publish';

const UpdateAction: DocumentActionComponent = () => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { canCreate, canUpdate } = useDocumentRBAC('PublishAction', ({ canCreate, canUpdate }) => ({
    canCreate,
    canUpdate,
  }));
  const { model, collectionType, id } = useDoc();
  const { create, update } = useDocumentActions();

  const isSubmitting = useForm('UpdateAction', ({ isSubmitting }) => isSubmitting);
  const modified = useForm('UpdateAction', ({ modified }) => modified);
  const setSubmitting = useForm('UpdateAction', ({ setSubmitting }) => setSubmitting);
  const document = useForm('UpdateAction', ({ values }) => values);

  return {
    disabled: Boolean((!id && !canCreate) || (id && !canUpdate)) || isSubmitting || !modified,
    label: formatMessage({
      id: 'content-manager.containers.Edit.save',
      defaultMessage: 'Save',
    }),
    onClick: async () => {
      setSubmitting(true);
      try {
        if (id) {
          await update(
            {
              collectionType,
              model,
              id,
            },
            {
              id,
              ...document,
            }
          );
        } else {
          const res = await create(
            {
              model,
            },
            document
          );

          if ('data' in res) {
            /**
             * TODO: refactor the router so we can just do `../${res.data.id}` instead of this.
             */
            navigate(`../${collectionType}/${model}/${res.data.id}`);
          }
        }
      } finally {
        setSubmitting(false);
      }
    },
  };
};

UpdateAction.type = 'update';

const DEFAULT_ACTIONS = [PublishAction, UpdateAction];

export { DocumentActions, DEFAULT_ACTIONS };
export type { DocumentActionDescription, DialogOptions, NotificationOptions, ModalOptions };
