import * as React from 'react';

import {
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  HeaderLayout,
  Typography,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { AllowedActions, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { ArrowLeft, Check, ExclamationMarkCircle } from '@strapi/icons';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';
import { NavLink, useHistory } from 'react-router-dom';

import { getTranslation } from '../../../utils/translations';

interface HeaderProps {
  allowedActions: AllowedActions;
}

const Header = ({ allowedActions: { canUpdate, canCreate, canPublish } }: HeaderProps) => {
  const {
    initialData,
    isCreatingEntry,
    isSingleType,
    status,
    layout,
    hasDraftAndPublish,
    modifiedData,
    onPublish,
    onUnpublish,
    publishConfirmation: { show: showPublishConfirmation, draftCount } = {},
    onPublishPromptDismissal,
  } = useCMEditViewDataManager();
  const { goBack } = useHistory();
  const [showWarningUnpublish, setWarningUnpublish] = React.useState(false);
  const { formatMessage } = useIntl();

  const currentContentTypeMainField = get(layout, ['settings', 'mainField'], 'id');
  const currentContentTypeName = get(layout, ['info', 'displayName'], 'NOT FOUND');
  const didChangeData =
    !isEqual(initialData, modifiedData) ||
    (isCreatingEntry && Object.keys(modifiedData).length > 0);

  const createEntryIntlTitle = formatMessage({
    id: getTranslation('containers.Edit.pluginHeader.title.new'),
    defaultMessage: 'Create an entry',
  });

  let title = createEntryIntlTitle;

  if (!isCreatingEntry && !isSingleType) {
    title = initialData[currentContentTypeMainField] || currentContentTypeName;
  }

  if (isSingleType) {
    title = currentContentTypeName;
  }

  let primaryAction = null;

  if (isCreatingEntry && canCreate) {
    primaryAction = (
      <Flex gap={2}>
        {hasDraftAndPublish && (
          <Button disabled startIcon={<Check />} variant="secondary">
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
        )}
        <Button disabled={!didChangeData} loading={status === 'submit-pending'} type="submit">
          {formatMessage({
            id: getTranslation('containers.Edit.submit'),
            defaultMessage: 'Save',
          })}
        </Button>
      </Flex>
    );
  }

  if (!isCreatingEntry && canUpdate) {
    const shouldShowPublishButton = hasDraftAndPublish && canPublish;
    const isPublished = typeof initialData.publishedAt === 'string';
    const isPublishButtonLoading = isPublished
      ? status === 'unpublish-pending'
      : status === 'publish-pending';
    const pubishButtonLabel = isPublished
      ? { id: 'app.utils.unpublish', defaultMessage: 'Unpublish' }
      : { id: 'app.utils.publish', defaultMessage: 'Publish' };

    const onClick = isPublished ? () => setWarningUnpublish(true) : () => onPublish?.();

    primaryAction = (
      <Flex>
        {shouldShowPublishButton && (
          <Button
            disabled={didChangeData}
            loading={isPublishButtonLoading}
            onClick={onClick}
            startIcon={<Check />}
            variant="secondary"
          >
            {formatMessage(pubishButtonLabel)}
          </Button>
        )}
        <Box paddingLeft={shouldShowPublishButton ? 2 : 0}>
          <Button disabled={!didChangeData} loading={status === 'submit-pending'} type="submit">
            {formatMessage({
              id: getTranslation('containers.Edit.submit'),
              defaultMessage: 'Save',
            })}
          </Button>
        </Box>
      </Flex>
    );
  }

  const toggleWarningUnpublish = () => setWarningUnpublish((prevState) => !prevState);

  const handleUnpublish = () => {
    toggleWarningUnpublish();
    onUnpublish?.();
  };

  const subtitle = `${formatMessage({
    id: getTranslation('api.id'),
    defaultMessage: 'API ID',
    // @ts-expect-error – issue comes from the context not having the correct layout from the admin.
  })}: ${layout?.apiID}`;

  return (
    <>
      <HeaderLayout
        title={title.toString()}
        primaryAction={primaryAction}
        subtitle={subtitle}
        navigationAction={
          <Link
            startIcon={<ArrowLeft />}
            // Needed in order to redirect the user with the correct search params
            // Since parts is using a link from react-router-dom the best way to do it is to disable the
            // event
            onClick={(e) => {
              e.preventDefault();
              goBack();
            }}
            as={NavLink}
            // @ts-expect-error – DS issue with inferring props from the `as` prop.
            to="/"
          >
            {formatMessage({
              id: 'global.back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
      />
      <Dialog
        onClose={toggleWarningUnpublish}
        title="Confirmation"
        aria-labelledby="confirmation"
        aria-describedby="confirm-description"
        isOpen={showWarningUnpublish}
      >
        <DialogBody icon={<ExclamationMarkCircle />}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Flex justifyContent="center" style={{ textAlign: 'center' }}>
              <Typography id="confirm-description">
                {formatMessage({
                  id: getTranslation('popUpWarning.warning.unpublish'),
                  defaultMessage: 'Unpublish this content will automatically change it to a draft.',
                })}
              </Typography>
            </Flex>
            <Flex justifyContent="center" style={{ textAlign: 'center' }}>
              <Typography id="confirm-description">
                {formatMessage({
                  id: getTranslation('popUpWarning.warning.unpublish-question'),
                  defaultMessage: 'Are you sure you want to unpublish it?',
                })}
              </Typography>
            </Flex>
          </Flex>
        </DialogBody>
        <DialogFooter
          startAction={
            <Button onClick={toggleWarningUnpublish} variant="tertiary">
              {formatMessage({
                id: 'components.popUpWarning.button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          }
          endAction={
            <Button variant="danger-light" onClick={handleUnpublish}>
              {formatMessage({
                id: 'components.popUpWarning.button.confirm',
                defaultMessage: 'Confirm',
              })}
            </Button>
          }
        />
      </Dialog>
      <Dialog
        // @ts-expect-error – Context issue with it living in the helper-plugin
        onClose={onPublishPromptDismissal}
        title={formatMessage({
          id: getTranslation(`popUpWarning.warning.has-draft-relations.title`),
          defaultMessage: 'Confirmation',
        })}
        labelledBy="confirmation"
        describedBy="confirm-description"
        // @ts-expect-error – Context issue with it living in the helper-plugin
        isOpen={showPublishConfirmation}
      >
        <DialogBody icon={<ExclamationMarkCircle />}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Typography textAlign="center" id="confirm-description">
              {draftCount}
              {/* @ts-expect-error – this is an issue with rendering a component with the formatMessage helper, perhaps a mis-match in types? */}
              {formatMessage(
                {
                  id: getTranslation(`popUpwarning.warning.has-draft-relations.message`),
                  defaultMessage:
                    '<b>{count, plural, one { relation is} other { relations are}}</b> not published yet and might lead to unexpected behavior.',
                },
                {
                  b: (chunks) => <Typography fontWeight="bold">{chunks}</Typography>,
                  count: draftCount,
                }
              )}
            </Typography>
            <Typography textAlign="center" id="confirm-description">
              {formatMessage({
                id: getTranslation('popUpWarning.warning.publish-question'),
                defaultMessage: 'Do you still want to publish?',
              })}
            </Typography>
          </Flex>
        </DialogBody>
        <DialogFooter
          startAction={
            <Button onClick={onPublishPromptDismissal} variant="tertiary">
              {formatMessage({
                id: 'components.popUpWarning.button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          }
          endAction={
            <Button variant="success" onClick={onPublish}>
              {formatMessage({
                id: getTranslation('popUpwarning.warning.has-draft-relations.button-confirm'),
                defaultMessage: 'Publish',
              })}
            </Button>
          }
        />
      </Dialog>
    </>
  );
};

export { Header };
export type { HeaderProps };
