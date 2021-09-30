import React, { memo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import BackIcon from '@strapi/icons/BackIcon';
import { HeaderLayout } from '@strapi/parts/Layout';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { Dialog, DialogBody, DialogFooter } from '@strapi/parts/Dialog';
import { Link } from '@strapi/parts/Link';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import AlertWarningIcon from '@strapi/icons/AlertWarningIcon';
import CheckIcon from '@strapi/icons/CheckIcon';
import PropTypes from 'prop-types';
import isEqualFastCompare from 'react-fast-compare';
import { getTrad } from '../../../utils';
import { connect, getDraftRelations, select } from './utils';

const Header = ({
  allowedActions: { canUpdate, canCreate, canPublish },
  componentLayouts,
  initialData,
  isCreatingEntry,
  isSingleType,
  hasDraftAndPublish,
  layout,
  modifiedData,
  onPublish,
  onUnpublish,
  status,
}) => {
  const { goBack } = useHistory();
  const [showWarningUnpublish, setWarningUnpublish] = useState(false);
  const [showWarningDraftRelation, setShowWarningDraftRelation] = useState(false);
  const { formatMessage } = useIntl();
  const draftRelationsCountRef = useRef(0);

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

  const checkIfHasDraftRelations = () => {
    const count = getDraftRelations(modifiedData, layout, componentLayouts);

    draftRelationsCountRef.current = count;

    return count;
  };

  let primaryAction = null;

  if (isCreatingEntry && canCreate) {
    primaryAction = (
      <Button disabled={!didChangeData} isLoading={status === 'submit-pending'} type="submit">
        {formatMessage({
          id: getTrad('containers.Edit.submit'),
          defaultMessage: 'Save',
        })}
      </Button>
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

    /* eslint-disable indent */
    const onClick = isPublished
      ? () => setWarningUnpublish(true)
      : () => {
          if (checkIfHasDraftRelations() === 0) {
            onPublish();
          } else {
            setShowWarningDraftRelation(true);
          }
        };
    /* eslint-enable indent */

    primaryAction = (
      <Row>
        {shouldShowPublishButton && (
          <Button
            disabled={didChangeData}
            loading={isPublishButtonLoading}
            onClick={onClick}
            startIcon={<CheckIcon />}
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
      </Row>
    );
  }

  const toggleWarningUnpublish = () => setWarningUnpublish(prevState => !prevState);
  const toggleWarningDraftRelation = () => setShowWarningDraftRelation(prevState => !prevState);

  const handlePublish = () => {
    toggleWarningDraftRelation();
    draftRelationsCountRef.current = 0;
    onPublish();
  };

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
        title={title}
        primaryAction={primaryAction}
        subtitle={subtitle}
        navigationAction={
          <Link
            startIcon={<BackIcon />}
            // Needed in order to redirect the user with the correct search params
            // Since parts is using a link from react-router-dom the best way to do it is to disable the
            // event
            onClick={e => {
              e.preventDefault();
              goBack();
            }}
            to="/"
          >
            {formatMessage({
              id: 'app.components.HeaderLayout.link.go-back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
      />
      {showWarningUnpublish && (
        <Dialog
          onClose={toggleWarningUnpublish}
          title="Confirmation"
          labelledBy="confirmation"
          describedBy="confirm-description"
          isOpen={showWarningUnpublish}
        >
          <DialogBody icon={<AlertWarningIcon />}>
            <Stack size={2}>
              <Row justifyContent="center" style={{ textAlign: 'center' }}>
                <Text id="confirm-description">
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
                </Text>
              </Row>
              <Row justifyContent="center" style={{ textAlign: 'center' }}>
                <Text id="confirm-description">
                  {formatMessage({
                    id: getTrad('popUpWarning.warning.unpublish-question'),
                    defaultMessage: 'Are you sure you want to unpublish it?',
                  })}
                </Text>
              </Row>
            </Stack>
          </DialogBody>
          <DialogFooter
            startAction={
              <Button onClick={toggleWarningUnpublish} variant="tertiary">
                {formatMessage({
                  id: 'components.popUpWarning.button.cancel',
                  defaultMessage: 'No, cancel',
                })}
              </Button>
            }
            endAction={
              <Button variant="danger-light" onClick={handleUnpublish}>
                {formatMessage({
                  id: 'components.popUpWarning.button.confirm',
                  defaultMessage: 'Yes, confirm',
                })}
              </Button>
            }
          />
        </Dialog>
      )}

      {showWarningDraftRelation && (
        <Dialog
          onClose={toggleWarningDraftRelation}
          title="Confirmation"
          labelledBy="confirmation"
          describedBy="confirm-description"
          isOpen={showWarningDraftRelation}
        >
          <DialogBody icon={<AlertWarningIcon />}>
            <Stack size={2}>
              <Row justifyContent="center" style={{ textAlign: 'center' }}>
                <Text id="confirm-description">
                  {draftRelationsCountRef.current}
                  {formatMessage(
                    {
                      id: getTrad(`popUpwarning.warning.has-draft-relations.message`),
                      defaultMessage:
                        '<b>{count, plural, =0 { of your content relations is} one { of your content relations is} other { of your content relations are}}</b> not published yet.<br></br>It might engender broken links and errors on your project.',
                    },
                    {
                      br: () => <br />,
                      b: chunks => <Text bold>{chunks}</Text>,
                      count: draftRelationsCountRef.current,
                    }
                  )}
                </Text>
              </Row>
              <Row justifyContent="center" style={{ textAlign: 'center' }}>
                <Text id="confirm-description">
                  {formatMessage({
                    id: getTrad('popUpWarning.warning.publish-question'),
                    defaultMessage: 'Do you still want to publish it?',
                  })}
                </Text>
              </Row>
            </Stack>
          </DialogBody>
          <DialogFooter
            startAction={
              <Button onClick={toggleWarningDraftRelation} variant="tertiary">
                {formatMessage({
                  id: 'components.popUpWarning.button.cancel',
                  defaultMessage: 'No, cancel',
                })}
              </Button>
            }
            endAction={
              <Button variant="success" onClick={handlePublish}>
                {formatMessage({
                  id: getTrad('popUpwarning.warning.has-draft-relations.button-confirm'),
                  defaultMessage: 'Yes, publish',
                })}
              </Button>
            }
          />
        </Dialog>
      )}
    </>
  );
};

Header.propTypes = {
  allowedActions: PropTypes.shape({
    canUpdate: PropTypes.bool.isRequired,
    canCreate: PropTypes.bool.isRequired,
    canPublish: PropTypes.bool.isRequired,
  }).isRequired,
  componentLayouts: PropTypes.object.isRequired,
  initialData: PropTypes.object.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  hasDraftAndPublish: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onPublish: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
};

const Memoized = memo(Header, isEqualFastCompare);

export default connect(
  Memoized,
  select
);
export { Header };
