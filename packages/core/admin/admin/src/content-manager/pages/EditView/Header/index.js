import React, { memo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import isEqualFastCompare from 'react-fast-compare';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import { Link } from '@strapi/helper-plugin';
import { HeaderLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Dialog, DialogBody, DialogFooter } from '@strapi/design-system/Dialog';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import ExclamationMarkCircle from '@strapi/icons/ExclamationMarkCircle';
import Check from '@strapi/icons/Check';
import styled from 'styled-components';
import { getTrad } from '../../../utils';
import { connect, select } from './utils';

// TODO: replace with textAlign Typography props when available
const FlexTextAlign = styled(Flex)`
  text-align: center;
`;

const Header = ({
  allowedActions: { canUpdate, canCreate, canPublish },
  initialData,
  isCreatingEntry,
  isSingleType,
  hasDraftAndPublish,
  layout,
  modifiedData,
  onPublish,
  onUnpublish,
  status,
  publishConfirmation: { show: showPublishConfirmation, draftCount },
  onPublishPromptDismissal,
}) => {
  const { goBack } = useHistory();
  const [showWarningUnpublish, setWarningUnpublish] = useState(false);
  const { formatMessage } = useIntl();

  const currentContentTypeMainField = get(layout, ['settings', 'mainField'], 'id');
  const currentContentTypeName = get(layout, ['info', 'displayName'], 'NOT FOUND');
  const didChangeData =
    !isEqual(initialData, modifiedData) || (isCreatingEntry && !isEmpty(modifiedData));

  const createEntryIntlTitle = formatMessage({
    id: getTrad('containers.Edit.pluginHeader.title.new'),
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
      <Stack horizontal spacing={2}>
        {hasDraftAndPublish && (
          <Button disabled startIcon={<Check />} variant="secondary">
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
        )}
        <Button disabled={!didChangeData} loading={status === 'submit-pending'} type="submit">
          {formatMessage({
            id: getTrad('containers.Edit.submit'),
            defaultMessage: 'Save',
          })}
        </Button>
      </Stack>
    );
  }

  if (!isCreatingEntry && canUpdate) {
    const shouldShowPublishButton = hasDraftAndPublish && canPublish;
    const isPublished = !isEmpty(initialData.publishedAt);
    const isPublishButtonLoading = isPublished
      ? status === 'unpublish-pending'
      : status === 'publish-pending';
    const pubishButtonLabel = isPublished
      ? { id: 'app.utils.unpublish', defaultMessage: 'Unpublish' }
      : { id: 'app.utils.publish', defaultMessage: 'Publish' };

    const onClick = isPublished ? () => setWarningUnpublish(true) : () => onPublish();

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
              id: getTrad('containers.Edit.submit'),
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
    onUnpublish();
  };

  const subtitle = `${formatMessage({
    id: getTrad('api.id'),
    defaultMessage: 'API ID ',
  })} : ${layout.apiID}`;

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
        labelledBy="confirmation"
        describedBy="confirm-description"
        isOpen={showWarningUnpublish}
      >
        <DialogBody icon={<ExclamationMarkCircle />}>
          <Stack spacing={2}>
            <Flex justifyContent="center" style={{ textAlign: 'center' }}>
              <Typography id="confirm-description">
                {formatMessage(
                  {
                    id: getTrad('popUpWarning.warning.unpublish'),
                    defaultMessage:
                      'Unpublish this content will automatically change it to a draft.',
                  },
                  {
                    br: () => <br />,
                  }
                )}
              </Typography>
            </Flex>
            <Flex justifyContent="center" style={{ textAlign: 'center' }}>
              <Typography id="confirm-description">
                {formatMessage({
                  id: getTrad('popUpWarning.warning.unpublish-question'),
                  defaultMessage: 'Are you sure you want to unpublish it?',
                })}
              </Typography>
            </Flex>
          </Stack>
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
        onClose={onPublishPromptDismissal}
        title={formatMessage({
          id: getTrad(`popUpWarning.warning.has-draft-relations.title`),
          defaultMessage: 'Confirmation',
        })}
        labelledBy="confirmation"
        describedBy="confirm-description"
        isOpen={showPublishConfirmation}
      >
        <DialogBody icon={<ExclamationMarkCircle />}>
          <Stack spacing={2}>
            <FlexTextAlign justifyContent="center">
              <Typography id="confirm-description">
                {draftCount}
                {formatMessage(
                  {
                    id: getTrad(`popUpwarning.warning.has-draft-relations.message`),
                    defaultMessage:
                      '<b>{count, plural, one { relation is} other { relations are}}</b> not published yet and might lead to unexpected behavior.',
                  },
                  {
                    b: (chunks) => <Typography fontWeight="bold">{chunks}</Typography>,
                    count: draftCount,
                  }
                )}
              </Typography>
            </FlexTextAlign>
            <FlexTextAlign justifyContent="center">
              <Typography id="confirm-description">
                {formatMessage({
                  id: getTrad('popUpWarning.warning.publish-question'),
                  defaultMessage: 'Do you still want to publish?',
                })}
              </Typography>
            </FlexTextAlign>
          </Stack>
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
                id: getTrad('popUpwarning.warning.has-draft-relations.button-confirm'),
                defaultMessage: 'Publish',
              })}
            </Button>
          }
        />
      </Dialog>
    </>
  );
};

Header.propTypes = {
  allowedActions: PropTypes.shape({
    canUpdate: PropTypes.bool.isRequired,
    canCreate: PropTypes.bool.isRequired,
    canPublish: PropTypes.bool.isRequired,
  }).isRequired,
  initialData: PropTypes.object.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  hasDraftAndPublish: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onPublish: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
  publishConfirmation: PropTypes.shape({
    show: PropTypes.bool.isRequired,
    draftCount: PropTypes.number.isRequired,
  }).isRequired,
  onPublishPromptDismissal: PropTypes.func.isRequired,
};

const Memoized = memo(Header, isEqualFastCompare);

export default connect(Memoized, select);
export { Header };
