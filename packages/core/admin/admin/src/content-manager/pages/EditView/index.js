import React, { Suspense, memo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import {
  CheckPermissions,
  LoadingIndicatorPage,
  useTracking,
  LinkButton,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { ContentLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Main } from '@strapi/design-system/Main';
import { Stack } from '@strapi/design-system/Stack';
import Layer from '@strapi/icons/Layer';
import Pencil from '@strapi/icons/Pencil';
import { InjectionZone } from '../../../shared/components';
import permissions from '../../../permissions';
import DynamicZone from '../../components/DynamicZone';

import CollectionTypeFormWrapper from '../../components/CollectionTypeFormWrapper';
import EditViewDataManagerProvider from '../../components/EditViewDataManagerProvider';
import SingleTypeFormWrapper from '../../components/SingleTypeFormWrapper';
import { getTrad } from '../../utils';
import DraftAndPublishBadge from './DraftAndPublishBadge';
import Informations from './Informations';
import Header from './Header';
import { createAttributesLayout, getFieldsActionMatchingPermissions } from './utils';
import DeleteLink from './DeleteLink';
import GridRow from './GridRow';

const cmPermissions = permissions.contentManager;
const ctbPermissions = [{ action: 'plugin::content-type-builder.read', subject: null }];

/* eslint-disable  react/no-array-index-key */
const EditView = ({ allowedActions, isSingleType, goBack, slug, id, origin, userPermissions }) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { createActionAllowedFields, readActionAllowedFields, updateActionAllowedFields } =
    getFieldsActionMatchingPermissions(userPermissions, slug);

  const { layout, formattedContentTypeLayout } = useSelector((state) => {
    const layout = state['content-manager_editViewLayoutManager'].currentLayout;

    return {
      layout,
      formattedContentTypeLayout: createAttributesLayout(layout?.contentType ?? {}),
    };
  });

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

  return (
    <DataManagementWrapper allLayoutData={layout} slug={slug} id={id} origin={origin}>
      {({
        componentsDataStructure,
        contentTypeDataStructure,
        data,
        isCreatingEntry,
        isLoadingForData,
        onDelete,
        onDeleteSucceeded,
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
                    <Suspense fallback={<LoadingIndicatorPage />}>
                      <Stack spacing={6}>
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
                              <Stack spacing={6}>
                                {row.map((grid, gridRowIndex) => (
                                  <GridRow columns={grid} key={gridRowIndex} />
                                ))}
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Suspense>
                  </GridItem>
                  <GridItem col={3} s={12}>
                    <Stack spacing={2}>
                      <DraftAndPublishBadge />
                      <Box
                        as="aside"
                        aria-labelledby="additional-informations"
                        background="neutral0"
                        borderColor="neutral150"
                        hasRadius
                        paddingBottom={4}
                        paddingLeft={4}
                        paddingRight={4}
                        paddingTop={6}
                        shadow="tableShadow"
                      >
                        <Informations />
                        <InjectionZone area="contentManager.editView.informations" />
                      </Box>
                      <Box as="aside" aria-labelledby="links">
                        <Stack spacing={2}>
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

                          {allowedActions.canDelete && (
                            <DeleteLink
                              isCreatingEntry={isCreatingEntry}
                              onDelete={onDelete}
                              onDeleteSucceeded={onDeleteSucceeded}
                            />
                          )}
                        </Stack>
                      </Box>
                    </Stack>
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

export { EditView };
export default memo(EditView);

// export default () => 'TODO Edit view';
