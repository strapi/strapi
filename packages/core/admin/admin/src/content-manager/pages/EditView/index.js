import * as React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import {
  CheckPermissions,
  useTracking,
  LinkButton,
  LoadingIndicatorPage,
  useNotification,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { ContentLayout, Box, Flex, Grid, GridItem, Main } from '@strapi/design-system';
import { Pencil, Layer } from '@strapi/icons';
import InformationBox from 'ee_else_ce/content-manager/pages/EditView/InformationBox';
import { useLocation } from 'react-router-dom';
import { InjectionZone } from '../../../shared/components';
import permissions from '../../../permissions';
import DynamicZone from '../../components/DynamicZone';
import { getTrad } from '../../utils';

import CollectionTypeFormWrapper from '../../components/CollectionTypeFormWrapper';
import EditViewDataManagerProvider from '../../components/EditViewDataManagerProvider';
import SingleTypeFormWrapper from '../../components/SingleTypeFormWrapper';
import useLazyComponents from '../../hooks/useLazyComponents';
import DraftAndPublishBadge from './DraftAndPublishBadge';
import Header from './Header';
import { getFieldsActionMatchingPermissions } from './utils';
import DeleteLink from './DeleteLink';
import GridRow from './GridRow';
import { selectCurrentLayout, selectAttributesLayout, selectCustomFieldUids } from './selectors';
import { useOnce } from './hooks/useOnce';

const cmPermissions = permissions.contentManager;
const ctbPermissions = [{ action: 'plugin::content-type-builder.read', subject: null }];

/* eslint-disable  react/no-array-index-key */
const EditView = ({ allowedActions, isSingleType, goBack, slug, id, origin, userPermissions }) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const location = useLocation();
  const toggleNotification = useNotification();

  useOnce(() => {
    /**
     * We only ever want to fire the notification once otherwise
     * whenever the app re-renders it'll pop up regardless of
     * what we do because the state comes from react-router-dom
     */
    if (location?.state && 'error' in location.state) {
      toggleNotification({
        type: 'warning',
        message: location.state.error,
      });
    }
  });

  const { layout, formattedContentTypeLayout, customFieldUids } = useSelector((state) => ({
    layout: selectCurrentLayout(state),
    formattedContentTypeLayout: selectAttributesLayout(state),
    customFieldUids: selectCustomFieldUids(state),
  }));

  const { isLazyLoading, lazyComponentStore } = useLazyComponents(customFieldUids);

  const { createActionAllowedFields, readActionAllowedFields, updateActionAllowedFields } =
    getFieldsActionMatchingPermissions(userPermissions, slug);

  const configurationPermissions = isSingleType
    ? cmPermissions.singleTypesConfigurations
    : cmPermissions.collectionTypesConfigurations;

  // // FIXME when changing the routing
  const configurationsURL = `/content-manager/${
    isSingleType ? 'singleType' : 'collectionType'
  }/${slug}/configurations/edit`;

  const DataManagementWrapper = isSingleType ? SingleTypeFormWrapper : CollectionTypeFormWrapper;

  // Check if a block is a dynamic zone
  const isDynamicZone = (block) => {
    return block.every((subBlock) => {
      return subBlock.every((obj) => obj.fieldSchema.type === 'dynamiczone');
    });
  };

  if (isLazyLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <DataManagementWrapper allLayoutData={layout} slug={slug} id={id} origin={origin}>
      {({
        componentsDataStructure,
        contentTypeDataStructure,
        data,
        isCreatingEntry,
        isLoadingForData,
        onDelete,
        onPost,
        onPublish,
        onDraftRelationCheck,
        onPut,
        onUnpublish,
        redirectionLink,
        status,
      }) => {
        return (
          <EditViewDataManagerProvider
            allowedActions={allowedActions}
            allLayoutData={layout}
            createActionAllowedFields={createActionAllowedFields}
            componentsDataStructure={componentsDataStructure}
            contentTypeDataStructure={contentTypeDataStructure}
            from={redirectionLink}
            initialValues={data}
            isCreatingEntry={isCreatingEntry}
            isLoadingForData={isLoadingForData}
            isSingleType={isSingleType}
            onPost={onPost}
            onPublish={onPublish}
            onDraftRelationCheck={onDraftRelationCheck}
            onPut={onPut}
            onUnpublish={onUnpublish}
            readActionAllowedFields={readActionAllowedFields}
            redirectToPreviousPage={goBack}
            slug={slug}
            status={status}
            updateActionAllowedFields={updateActionAllowedFields}
          >
            <Main aria-busy={status !== 'resolved'}>
              <Header allowedActions={allowedActions} />
              <ContentLayout>
                <Grid gap={4}>
                  <GridItem col={9} s={12}>
                    <Flex direction="column" alignItems="stretch" gap={6}>
                      {formattedContentTypeLayout.map((row, index) => {
                        if (isDynamicZone(row)) {
                          const {
                            0: {
                              0: { name, fieldSchema, metadatas, labelAction },
                            },
                          } = row;

                          return (
                            <Box key={index}>
                              <Grid gap={4}>
                                <GridItem col={12} s={12} xs={12}>
                                  <DynamicZone
                                    name={name}
                                    fieldSchema={fieldSchema}
                                    labelAction={labelAction}
                                    metadatas={metadatas}
                                  />
                                </GridItem>
                              </Grid>
                            </Box>
                          );
                        }

                        return (
                          <Box
                            key={index}
                            hasRadius
                            background="neutral0"
                            shadow="tableShadow"
                            paddingLeft={6}
                            paddingRight={6}
                            paddingTop={6}
                            paddingBottom={6}
                            borderColor="neutral150"
                          >
                            <Flex direction="column" alignItems="stretch" gap={6}>
                              {row.map((grid, gridRowIndex) => (
                                <GridRow
                                  columns={grid}
                                  customFieldInputs={lazyComponentStore}
                                  key={gridRowIndex}
                                />
                              ))}
                            </Flex>
                          </Box>
                        );
                      })}
                    </Flex>
                  </GridItem>
                  <GridItem col={3} s={12}>
                    <Flex direction="column" alignItems="stretch" gap={2}>
                      <DraftAndPublishBadge />
                      <Box
                        as="aside"
                        aria-labelledby="additional-information"
                        background="neutral0"
                        borderColor="neutral150"
                        hasRadius
                        paddingBottom={4}
                        paddingLeft={4}
                        paddingRight={4}
                        paddingTop={6}
                        shadow="tableShadow"
                      >
                        <InformationBox />
                        <InjectionZone area="contentManager.editView.informations" />
                      </Box>
                      <Box as="aside" aria-labelledby="links">
                        <Flex direction="column" alignItems="stretch" gap={2}>
                          <InjectionZone area="contentManager.editView.right-links" slug={slug} />
                          {slug !== 'strapi::administrator' && (
                            <CheckPermissions permissions={ctbPermissions}>
                              <LinkButton
                                onClick={() => {
                                  trackUsage('willEditEditLayout');
                                }}
                                size="S"
                                startIcon={<Pencil />}
                                style={{ width: '100%' }}
                                to={`/plugins/content-type-builder/content-types/${slug}`}
                                variant="secondary"
                              >
                                {formatMessage({
                                  id: getTrad('link-to-ctb'),
                                  defaultMessage: 'Edit the model',
                                })}
                              </LinkButton>
                            </CheckPermissions>
                          )}

                          <CheckPermissions permissions={configurationPermissions}>
                            <LinkButton
                              size="S"
                              startIcon={<Layer />}
                              style={{ width: '100%' }}
                              to={configurationsURL}
                              variant="secondary"
                            >
                              {formatMessage({
                                id: 'app.links.configure-view',
                                defaultMessage: 'Configure the view',
                              })}
                            </LinkButton>
                          </CheckPermissions>

                          {allowedActions.canDelete && !isCreatingEntry && (
                            <DeleteLink onDelete={onDelete} />
                          )}
                        </Flex>
                      </Box>
                    </Flex>
                  </GridItem>
                </Grid>
              </ContentLayout>
            </Main>
          </EditViewDataManagerProvider>
        );
      }}
    </DataManagementWrapper>
  );
};

EditView.defaultProps = {
  id: null,
  isSingleType: false,
  origin: null,
  userPermissions: [],
};

EditView.propTypes = {
  allowedActions: PropTypes.shape({
    canRead: PropTypes.bool.isRequired,
    canUpdate: PropTypes.bool.isRequired,
    canCreate: PropTypes.bool.isRequired,
    canDelete: PropTypes.bool.isRequired,
  }).isRequired,
  id: PropTypes.string,
  isSingleType: PropTypes.bool,
  goBack: PropTypes.func.isRequired,
  origin: PropTypes.string,
  slug: PropTypes.string.isRequired,
  userPermissions: PropTypes.array,
};

export default EditView;
