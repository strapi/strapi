import React, {
  memo,
  // useCallback, useMemo, useRef, useState
} from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import BackIcon from '@strapi/icons/BackIcon';
import { HeaderLayout } from '@strapi/parts/Layout';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { Link } from '@strapi/parts/Link';
import { Row } from '@strapi/parts/Row';
import PropTypes from 'prop-types';
import isEqualFastCompare from 'react-fast-compare';
// import { Text } from '@buffetjs/core';
// import {  ModalConfirm } from '@strapi/helper-plugin';
import { getTrad } from '../../../utils';
import {
  connect,
  // getDraftRelations,
  select,
} from './utils';

const Header = ({
  allowedActions: { canUpdate, canCreate, canPublish },
  // componentLayouts,
  initialData,
  isCreatingEntry,
  isSingleType,
  hasDraftAndPublish,
  layout,
  modifiedData,
  // onPublish,
  // onUnpublish,
  status,
}) => {
  const { goBack } = useHistory();

  // const [showWarningUnpublish, setWarningUnpublish] = useState(false);
  const { formatMessage } = useIntl();
  // const [draftRelationsCount, setDraftRelationsCount] = useState(0);
  // const [showWarningDraftRelation, setShowWarningDraftRelation] = useState(false);
  // const [shouldUnpublish, setShouldUnpublish] = useState(false);
  // const [shouldPublish, setShouldPublish] = useState(false);

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

  // const checkIfHasDraftRelations = useCallback(() => {
  //   const count = getDraftRelations(modifiedData, layout, componentLayouts);

  //   setDraftRelationsCount(count);

  //   return count > 0;
  // }, [modifiedData, layout, componentLayouts]);

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
    const isPublished = !isEmpty(initialData.published_at);
    const isPublishButtonLoading = isPublished
      ? status === 'unpublish-pending'
      : status === 'publish-pending';
    const pubishButtonLabel = isPublished
      ? { id: 'app.utils.unpublish', defaultMessage: 'Unpublish' }
      : { id: 'app.utils.publish', defaultMessage: 'Publish' };
    const onClick = () => console.log('should do something with publish');
    // TODO
    /* eslint-disable indent */
    // const onClick = isPublished
    //   ? () => setWarningUnpublish(true)
    //   : e => {
    //       if (!checkIfHasDraftRelations()) {
    //         onPublish(e);
    //       } else {
    //         setShowWarningDraftRelation(true);
    //       }
    //     };
    /* eslint-enable indent */

    primaryAction = (
      <Row>
        {shouldShowPublishButton && (
          <Button disabled={didChangeData} isLoading={isPublishButtonLoading} onClick={onClick}>
            {formatMessage(pubishButtonLabel)}
          </Button>
        )}
        <Box paddingLeft={shouldShowPublishButton ? 2 : 0}>
          <Button disabled={!didChangeData} isLoading={status === 'submit-pending'} type="submit">
            {formatMessage({
              id: getTrad('containers.Edit.submit'),
              defaultMessage: 'Save',
            })}
          </Button>
        </Box>
      </Row>
    );
  }

  // const toggleWarningPublish = () => setWarningUnpublish(prevState => !prevState);

  // const toggleWarningDraftRelation = useCallback(() => {
  //   setShowWarningDraftRelation(prev => !prev);
  // }, []);

  // const handleConfirmPublish = useCallback(() => {
  //   setShouldPublish(true);
  //   setShowWarningDraftRelation(false);
  // }, []);

  // const handleConfirmUnpublish = useCallback(() => {
  //   setShouldUnpublish(true);
  //   setWarningUnpublish(false);
  // }, []);

  // const handleCloseModalPublish = useCallback(
  //   e => {
  //     if (shouldPublish) {
  //       onPublish(e);
  //     }

  //     setShouldUnpublish(false);
  //   },
  //   [onPublish, shouldPublish]
  // );

  // const handleCloseModalUnpublish = useCallback(
  //   e => {
  //     if (shouldUnpublish) {
  //       onUnpublish(e);
  //     }

  //     setShouldUnpublish(false);
  //   },
  //   [onUnpublish, shouldUnpublish]
  // );

  // const contentIdSuffix = draftRelationsCount > 1 ? 'plural' : 'singular';

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
    </>
  );

  // return (
  //   <>
  //     <PluginHeader {...headerProps} />
  //     {hasDraftAndPublish && (
  //       <>
  //         <ModalConfirm
  //           isOpen={showWarningUnpublish}
  //           toggle={toggleWarningPublish}
  //           content={{
  //             id: getTrad('popUpWarning.warning.unpublish'),
  //             values: {
  //               br: () => <br />,
  //             },
  //           }}
  //           type="xwarning"
  //           onConfirm={handleConfirmUnpublish}
  //           onClosed={handleCloseModalUnpublish}
  //         >
  //           <Text>{formatMessage({ id: getTrad('popUpWarning.warning.unpublish-question') })}</Text>
  //         </ModalConfirm>
  //         <ModalConfirm
  //           confirmButtonLabel={{
  //             id: getTrad('popUpwarning.warning.has-draft-relations.button-confirm'),
  //           }}
  //           isOpen={showWarningDraftRelation}
  //           toggle={toggleWarningDraftRelation}
  //           onClosed={handleCloseModalPublish}
  //           onConfirm={handleConfirmPublish}
  //           type="success"
  //           content={{
  //             id: getTrad(`popUpwarning.warning.has-draft-relations.message.${contentIdSuffix}`),
  //             values: {
  //               count: draftRelationsCount,
  //               b: chunks => (
  //                 <Text as="span" fontWeight="bold">
  //                   {chunks}
  //                 </Text>
  //               ),
  //               br: () => <br />,
  //             },
  //           }}
  //         >
  //           <Text>{formatMessage({ id: getTrad('popUpWarning.warning.publish-question') })}</Text>
  //         </ModalConfirm>
  //       </>
  //     )}
  //   </>
  // );
};

Header.propTypes = {
  allowedActions: PropTypes.shape({
    canUpdate: PropTypes.bool.isRequired,
    canCreate: PropTypes.bool.isRequired,
    canPublish: PropTypes.bool.isRequired,
  }).isRequired,
  // componentLayouts: PropTypes.object.isRequired,
  initialData: PropTypes.object.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  hasDraftAndPublish: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object.isRequired,
  // onPublish: PropTypes.func.isRequired,
  // onUnpublish: PropTypes.func.isRequired,
};

const Memoized = memo(Header, isEqualFastCompare);

export default connect(Memoized, select);
