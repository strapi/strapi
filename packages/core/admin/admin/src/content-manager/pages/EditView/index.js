import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import {
  CheckPermissions,
  useTracking,
  LinkButton,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { ContentLayout, Box, Grid, GridItem, Main, Flex } from '@strapi/design-system';
import { Pencil, Layer } from '@strapi/icons';
import { InjectionZone } from '../../../shared/components';
import permissions from '../../../permissions';
import DynamicZone from '../../components/DynamicZone';

import EditViewDataManagerProvider from '../../components/EditViewDataManagerProvider';
import { getTrad } from '../../utils';
import useLazyComponents from '../../hooks/useLazyComponents';
import DraftAndPublishBadge from './DraftAndPublishBadge';
import Information from './Information';
import Header from './Header';
import { getFieldsActionMatchingPermissions } from './utils';
import DeleteLink from './DeleteLink';
import GridRow from './GridRow';
import { selectCurrentLayout, selectAttributesLayout, selectCustomFieldUids } from './selectors';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';

import { useEntity } from '../../hooks/useEntity';

const cmPermissions = permissions.contentManager;
const ctbPermissions = [{ action: 'plugin::content-type-builder.read', subject: null }];

const EditView = ({ allowedActions, isSingleType, goBack, slug, id, userPermissions }) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { layout, formattedContentTypeLayout, customFieldUids } = useSelector((state) => ({
    layout: selectCurrentLayout(state),
    formattedContentTypeLayout: selectAttributesLayout(state),
    customFieldUids: selectCustomFieldUids(state),
  }));
  const { componentsDataStructure, contentTypeDataStructure, status } =
    useSelector(selectCrudReducer);
  const { del, entity, isCreating } = useEntity(layout, id);

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
    <EditViewDataManagerProvider
      allowedActions={allowedActions}
      allLayoutData={layout}
      createActionAllowedFields={createActionAllowedFields}
      componentsDataStructure={componentsDataStructure}
      contentTypeDataStructure={contentTypeDataStructure}
      // todo
      from={/* redirectionLink */ '/'}
      isLoadingForData={entity.isLoading}
      isSingleType={isSingleType}
      // todo
      readActionAllowedFields={readActionAllowedFields}
      redirectToPreviousPage={goBack}
      slug={slug}
      status={status}
      updateActionAllowedFields={updateActionAllowedFields}
      id={id}
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
                      // eslint-disable-next-line react/no-array-index-key
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
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      hasRadius
                      background="neutral0"
                      shadow="tableShadow"
                      padding={6}
                      borderColor="neutral150"
                    >
                      <Flex direction="column" alignItems="stretch" gap={6}>
                        {row.map((grid, gridRowIndex) => (
                          <GridRow
                            columns={grid}
                            customFieldInputs={lazyComponentStore}
                            // eslint-disable-next-line react/no-array-index-key
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
                  <Information />
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

                    {allowedActions.canDelete && !isCreating && <DeleteLink onDelete={del} />}
                  </Flex>
                </Box>
              </Flex>
            </GridItem>
          </Grid>
        </ContentLayout>
      </Main>
    </EditViewDataManagerProvider>
  );
};

EditView.defaultProps = {
  id: null,
  isSingleType: false,
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
  slug: PropTypes.string.isRequired,
  userPermissions: PropTypes.array,
};

export default memo(EditView);
