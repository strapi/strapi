import * as React from 'react';

import { createSelector } from '@reduxjs/toolkit';
import { Main, ContentLayout, Grid, GridItem, Flex, Box } from '@strapi/design-system';
import {
  CheckPermissions,
  LinkButton,
  LoadingIndicatorPage,
  useNotification,
  useTracking,
  useRBAC,
  Permission,
  AllowedActions,
} from '@strapi/helper-plugin';
import { Layer, Pencil } from '@strapi/icons';
import { Attribute, Entity } from '@strapi/types';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { RouteComponentProps, useLocation } from 'react-router-dom';

import { useTypedSelector } from '../../../core/store/hooks';
import { useEnterprise } from '../../../hooks/useEnterprise';
import { selectAdminPermissions } from '../../../selectors';
import { InjectionZone } from '../../../shared/components/InjectionZone';
import { CollectionTypeFormWrapper } from '../../components/CollectionTypeFormWrapper';
import { DynamicZone } from '../../components/DynamicZone/Field';
import { EditViewDataManagerProvider } from '../../components/EditViewDataManagerProvider/Provider';
import { FieldComponent } from '../../components/FieldComponent';
import { Inputs } from '../../components/Inputs';
import { SingleTypeFormWrapper } from '../../components/SingleTypeFormWrapper';
import { useLazyComponents } from '../../hooks/useLazyComponents';
import {
  generatePermissionsObject,
  getFieldsActionMatchingPermissions,
} from '../../utils/permissions';
import { getTranslation } from '../../utils/translations';

import { DeleteLink } from './components/DeleteLink';
import { DraftAndPublishBadge } from './components/DraftAndPublishBadge';
import { Header } from './components/Header';
import { InformationBoxCE } from './components/InformationBoxCE';
import { useOnce } from './hooks/useOnce';

import type { RootState } from '../../../core/store/configure';
import type { EditLayoutRow, FormattedLayouts } from '../../utils/layouts';

// TODO: this seems suspicious
const CTB_PERMISSIONS = [{ action: 'plugin::content-type-builder.read', subject: null }];

/* -------------------------------------------------------------------------------------------------
 * EditViewPage
 * -----------------------------------------------------------------------------------------------*/

interface EditViewPageProps {
  allowedActions: AllowedActions;
  goBack: RouteComponentProps['history']['goBack'];
  id?: Entity.ID;
  isSingleType?: boolean;
  origin?: string;
  slug: string;
  userPermissions?: Permission[];
}

const EditViewPage = ({
  allowedActions,
  isSingleType = false,
  goBack,
  slug,
  id,
  origin,
  userPermissions = [],
}: EditViewPageProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const permissions = useSelector(selectAdminPermissions);
  const location = useLocation<{ error?: string }>();
  const toggleNotification = useNotification();
  const Information = useEnterprise(
    InformationBoxCE,
    async () =>
      (
        await import(
          '../../../../../ee/admin/src/content-manager/pages/EditView/components/InformationBoxEE'
        )
      ).InformationBoxEE
  );

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
        timeout: 5000,
      });
    }
  });

  const formattedContentTypeLayout = useTypedSelector(selectAttributesLayout);
  const customFieldUids = useTypedSelector(selectCustomFieldUids);

  const { isLazyLoading, lazyComponentStore } = useLazyComponents(customFieldUids);

  const { createActionAllowedFields, readActionAllowedFields, updateActionAllowedFields } =
    getFieldsActionMatchingPermissions(userPermissions, slug);

  const configurationPermissions =
    (isSingleType
      ? permissions.contentManager?.singleTypesConfigurations
      : permissions.contentManager?.collectionTypesConfigurations) ?? [];

  // // FIXME when changing the routing
  const configurationsURL = `/content-manager/${
    isSingleType ? 'singleType' : 'collectionType'
  }/${slug}/configurations/edit`;

  const DataManagementWrapper = isSingleType ? SingleTypeFormWrapper : CollectionTypeFormWrapper;

  // Check if a block is a dynamic zone
  const isDynamicZone = (
    block: EditLayoutRow[][]
  ): block is Array<
    Omit<EditLayoutRow, 'fieldSchema'> & {
      fieldSchema: Attribute.DynamicZone;
    }
  >[] => {
    return block.every((subBlock) => {
      return subBlock.every((obj) => obj.fieldSchema.type === 'dynamiczone');
    });
  };

  if (isLazyLoading) {
    return <LoadingIndicatorPage />;
  }

  // wait until the EE component is fully loaded before rendering, to prevent flickering
  if (!Information) {
    return null;
  }

  return (
    <DataManagementWrapper slug={slug} id={id} origin={origin}>
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
                          const [[{ name, fieldSchema, metadatas, ...restProps }]] = row;

                          return (
                            <Box key={index}>
                              <Grid gap={4}>
                                <GridItem col={12} s={12} xs={12}>
                                  <DynamicZone
                                    name={name}
                                    fieldSchema={fieldSchema}
                                    metadatas={metadatas}
                                    {...restProps}
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
                              {row.map((columns, gridRowIndex) => (
                                <Grid key={gridRowIndex} gap={4}>
                                  {columns.map(
                                    ({
                                      fieldSchema,
                                      metadatas,
                                      name,
                                      size,
                                      queryInfos,
                                      ...restProps
                                    }) => {
                                      const isComponent = fieldSchema.type === 'component';

                                      if (isComponent) {
                                        const {
                                          component,
                                          max,
                                          min,
                                          repeatable = false,
                                          required = false,
                                        } = fieldSchema;

                                        return (
                                          <GridItem col={size} s={12} xs={12} key={component}>
                                            <FieldComponent
                                              componentUid={component}
                                              isRepeatable={repeatable}
                                              intlLabel={{
                                                id: metadatas.label,
                                                defaultMessage: metadatas.label,
                                              }}
                                              max={max}
                                              min={min}
                                              name={name}
                                              required={required}
                                              {...restProps}
                                            />
                                          </GridItem>
                                        );
                                      }

                                      return (
                                        <GridItem col={size} key={name} s={12} xs={12}>
                                          <Inputs
                                            size={size}
                                            fieldSchema={fieldSchema}
                                            keys={name}
                                            metadatas={metadatas}
                                            queryInfos={queryInfos}
                                            customFieldInputs={lazyComponentStore}
                                            {...restProps}
                                          />
                                        </GridItem>
                                      );
                                    }
                                  )}
                                </Grid>
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
                            <CheckPermissions permissions={CTB_PERMISSIONS}>
                              <LinkButton
                                onClick={() => {
                                  trackUsage('willEditEditLayout');
                                }}
                                size="S"
                                startIcon={<Pencil />}
                                style={{ width: '100%' }}
                                // @ts-expect-error – Remove deprecated component
                                to={`/plugins/content-type-builder/content-types/${slug}`}
                                variant="secondary"
                              >
                                {formatMessage({
                                  id: getTranslation('link-to-ctb'),
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
                              // @ts-expect-error – Remove deprecated component
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

/* -------------------------------------------------------------------------------------------------
 * Selectors
 * -----------------------------------------------------------------------------------------------*/

/**
 * The layout has no concept of UI panes, it only knows what should be on separate rows, therefore
 * we manually split the layout into panes based on the presence of dynamic zones. where we then
 * use the original layout. Hence why, ITS ANOTHER ARRAY!
 */
const selectAttributesLayout = createSelector(
  (state: RootState) => state['content-manager_editViewLayoutManager'].currentLayout,
  (layout) => {
    const currentContentTypeLayoutData = layout?.contentType;

    if (!currentContentTypeLayoutData) {
      return [];
    }

    const currentLayout = currentContentTypeLayoutData.layouts.edit;

    let currentRowIndex = 0;
    const newLayout: Array<FormattedLayouts['contentType']['layouts']['edit']> = [];

    currentLayout.forEach((row) => {
      const hasDynamicZone = row.some(
        ({ name }) => currentContentTypeLayoutData.attributes[name]['type'] === 'dynamiczone'
      );

      if (!newLayout[currentRowIndex]) {
        newLayout[currentRowIndex] = [];
      }

      if (hasDynamicZone) {
        currentRowIndex =
          currentRowIndex === 0 && newLayout[0].length === 0 ? 0 : currentRowIndex + 1;

        if (!newLayout[currentRowIndex]) {
          newLayout[currentRowIndex] = [];
        }
        newLayout[currentRowIndex].push(row);

        currentRowIndex += 1;
      } else {
        newLayout[currentRowIndex].push(row);
      }
    });

    return newLayout.filter((arr) => arr.length > 0);
  }
);

const selectCustomFieldUids = createSelector(
  (state: RootState) => state['content-manager_editViewLayoutManager'].currentLayout,
  (layout) => {
    if (!layout.contentType) return [];
    // Get all the fields on the content-type and its components
    const allFields = [
      ...layout.contentType.layouts.edit,
      ...Object.values(layout.components).flatMap((component) => component.layouts.edit),
    ].flat();

    // Filter that down to custom fields and map the uids
    const customFieldUids = allFields
      .filter((field) => field.fieldSchema.customField)
      .map((customField) => customField.fieldSchema.customField!);
    // Make sure the list is unique
    const uniqueCustomFieldUids = [...new Set(customFieldUids)];

    return uniqueCustomFieldUids;
  }
);

/* -------------------------------------------------------------------------------------------------
 * ProtectedEditViewPage
 * -----------------------------------------------------------------------------------------------*/

interface ProtectedEditViewPageProps extends Omit<EditViewPageProps, 'allowedActions'> {}

const ProtectedEditViewPage = ({
  slug,
  userPermissions = [],
  ...restProps
}: ProtectedEditViewPageProps) => {
  const viewPermissions = React.useMemo(() => generatePermissionsObject(slug), [slug]);
  const { isLoading, allowedActions } = useRBAC(
    viewPermissions,
    // TODO: just make usePermissions undefined by default in the reducer?
    userPermissions
  );

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <EditViewPage
      {...restProps}
      allowedActions={allowedActions}
      slug={slug}
      userPermissions={userPermissions}
    />
  );
};

export { EditViewPage, ProtectedEditViewPage };
export type { EditViewPageProps, ProtectedEditViewPageProps };
