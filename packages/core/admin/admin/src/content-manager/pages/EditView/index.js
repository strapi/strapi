import React, {
  memo,
  // useCallback,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
// import get from 'lodash/get';
// import // BaselineAlignment,
// LiLink,
// CheckPermissions,
// useTracking,
// '@strapi/helper-plugin';
import { ContentLayout } from '@strapi/parts/Layout';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Main } from '@strapi/parts/Main';
import { Stack } from '@strapi/parts/Stack';

// import { Padded } from '@buffetjs/core';
import { InjectionZone } from '../../../shared/components';
// import permissions from '../../../permissions';
// import Container from '../../components/Container';
// import DynamicZone from '../../components/DynamicZone';
// import FormWrapper from '../../components/FormWrapper';
// import FieldComponent from '../../components/FieldComponent';
// import Inputs from '../../components/Inputs';
// import SelectWrapper from '../../components/SelectWrapper';
import CollectionTypeFormWrapper from '../../components/CollectionTypeFormWrapper';
import EditViewDataManagerProvider from '../../components/EditViewDataManagerProvider';
import SingleTypeFormWrapper from '../../components/SingleTypeFormWrapper';
import DraftAndPublishBadge from './DraftAndPublishBadge';
import Informations from './Informations';
import Header from './Header';
import {
  // createAttributesLayout,
  getFieldsActionMatchingPermissions,
} from './utils';
// import { LinkWrapper, SubWrapper } from './components';
// import DeleteLink from './DeleteLink';
// import InformationCard from './InformationCard';
// import { getTrad } from '../../utils';

// const cmPermissions = permissions.contentManager;
// const ctbPermissions = [{ action: 'plugin::content-type-builder.read', subject: null }];

// /* eslint-disable  react/no-array-index-key */
const EditView = ({
  allowedActions,
  isSingleType,
  goBack,
  layout,
  slug,
  id,
  origin,
  userPermissions,
}) => {
  // const { trackUsage } = useTracking();
  const {
    createActionAllowedFields,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useMemo(() => {
    return getFieldsActionMatchingPermissions(userPermissions, slug);
  }, [userPermissions, slug]);
  // const configurationPermissions = useMemo(() => {
  //   return isSingleType
  //     ? cmPermissions.singleTypesConfigurations
  //     : cmPermissions.collectionTypesConfigurations;
  // }, [isSingleType]);

  // FIXME when changing the routing
  // const configurationsURL = `/content-manager/${
  //   isSingleType ? 'singleType' : 'collectionType'
  // }/${slug}/configurations/edit`;
  // const currentContentTypeLayoutData = get(layout, ['contentType'], {})

  const DataManagementWrapper = useMemo(
    () => (isSingleType ? SingleTypeFormWrapper : CollectionTypeFormWrapper),
    [isSingleType]
  );

  // Check if a block is a dynamic zone
  // const isDynamicZone = useCallback(block => {
  //   return block.every(subBlock => {
  //     return subBlock.every(obj => obj.fieldSchema.type === 'dynamiczone');
  //   });
  // }, []);

  // const formattedContentTypeLayout = useMemo(() => {
  //   if (!currentContentTypeLayoutData.layouts) {
  //     return [];
  //   }

  //   return createAttributesLayout(
  //     currentContentTypeLayoutData.layouts.edit,
  //     currentContentTypeLayoutData.attributes
  //   );
  // }, [currentContentTypeLayoutData]);

  return (
    <DataManagementWrapper allLayoutData={layout} slug={slug} id={id} origin={origin}>
      {({
        componentsDataStructure,
        contentTypeDataStructure,
        data,
        isCreatingEntry,
        isLoadingForData,
        // onDelete,
        // onDeleteSucceeded,
        onPost,
        onPublish,
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
                    <Box
                      hasRadius
                      background="neutral0"
                      shadow="tableShadow"
                      paddingLeft={8}
                      paddingRight={8}
                      paddingTop={6}
                      paddingBottom={6}
                    >
                      inputs TODO
                    </Box>
                  </GridItem>
                  <GridItem col={3} s={12}>
                    <Stack size={2}>
                      <DraftAndPublishBadge />
                      <Box
                        as="aside"
                        background="neutral0"
                        borderColor="neutral150"
                        hasRadius
                        paddingBottom={4}
                        paddingLeft={4}
                        paddingRight={4}
                        paddingTop={6}
                      >
                        <Informations />
                        <InjectionZone area="contentManager.editView.informations" />
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

  // return (
  //   <DataManagementWrapper allLayoutData={layout} slug={slug} id={id} origin={origin}>
  //     {({
  // componentsDataStructure,
  // contentTypeDataStructure,
  // data,
  // isCreatingEntry,
  // isLoadingForData,
  // onDelete,
  // onDeleteSucceeded,
  // onPost,
  // onPublish,
  // onPut,
  // onUnpublish,
  // redirectionLink,
  // status,
  //     }) => {
  // return (
  //   <EditViewDataManagerProvider
  //     allowedActions={allowedActions}
  //     allLayoutData={layout}
  //     createActionAllowedFields={createActionAllowedFields}
  //     componentsDataStructure={componentsDataStructure}
  //     contentTypeDataStructure={contentTypeDataStructure}
  //     from={redirectionLink}
  //     initialValues={data}
  //     isCreatingEntry={isCreatingEntry}
  //     isLoadingForData={isLoadingForData}
  //     isSingleType={isSingleType}
  //     onPost={onPost}
  //     onPublish={onPublish}
  //     onPut={onPut}
  //     onUnpublish={onUnpublish}
  //     readActionAllowedFields={readActionAllowedFields}
  //     redirectToPreviousPage={goBack}
  //     slug={slug}
  //     status={status}
  //     updateActionAllowedFields={updateActionAllowedFields}
  //   >
  //           <Container className="container-fluid">
  //             <Header allowedActions={allowedActions} />
  //             <div className="row" style={{ paddingTop: 3 }}>
  //               <div className="col-md-12 col-lg-9" style={{ marginBottom: 13 }}>
  //                 {formattedContentTypeLayout.map((block, blockIndex) => {
  //                   if (isDynamicZone(block)) {
  //                     const {
  //                       0: {
  //                         0: { name, fieldSchema, metadatas, labelIcon },
  //                       },
  //                     } = block;
  //                     const baselineAlignementSize = blockIndex === 0 ? '3px' : '0';

  //                     return (
  //                       <BaselineAlignment key={blockIndex} top size={baselineAlignementSize}>
  //                         <DynamicZone
  //                           name={name}
  //                           fieldSchema={fieldSchema}
  //                           labelIcon={labelIcon}
  //                           metadatas={metadatas}
  //                         />
  //                       </BaselineAlignment>
  //                     );
  //                   }

  //                   return (
  //                     <FormWrapper key={blockIndex}>
  //                       {block.map((fieldsBlock, fieldsBlockIndex) => {
  //                         return (
  //                           <div className="row" key={fieldsBlockIndex}>
  //                             {fieldsBlock.map(
  //                               ({ name, size, fieldSchema, labelIcon, metadatas }, fieldIndex) => {
  //                                 const isComponent = fieldSchema.type === 'component';

  //                                 if (isComponent) {
  //                                   const { component, max, min, repeatable = false } = fieldSchema;
  //                                   const componentUid = fieldSchema.component;

  //                                   return (
  //                                     <FieldComponent
  //                                       key={componentUid}
  //                                       componentUid={component}
  //                                       labelIcon={labelIcon}
  //                                       isRepeatable={repeatable}
  //                                       label={metadatas.label}
  //                                       max={max}
  //                                       min={min}
  //                                       name={name}
  //                                     />
  //                                   );
  //                                 }

  //                                 return (
  //                                   <div className={`col-${size}`} key={name}>
  //                                     <Inputs
  //                                       autoFocus={
  //                                         blockIndex === 0 &&
  //                                         fieldsBlockIndex === 0 &&
  //                                         fieldIndex === 0
  //                                       }
  //                                       fieldSchema={fieldSchema}
  //                                       keys={name}
  //                                       labelIcon={labelIcon}
  //                                       metadatas={metadatas}
  //                                     />
  //                                   </div>
  //                                 );
  //                               }
  //                             )}
  //                           </div>
  //                         );
  //                       })}
  //                     </FormWrapper>
  //                   );
  //                 })}
  //               </div>
  //               <div className="col-md-12 col-lg-3">
  //                 <InformationCard />
  //                 <Padded size="smd" top />
  //                 {currentContentTypeLayoutData.layouts.editRelations.length > 0 && (
  //                   <SubWrapper style={{ padding: '0 20px 1px', marginBottom: '25px' }}>
  //                     <div style={{ paddingTop: '22px' }}>
  //                       {currentContentTypeLayoutData.layouts.editRelations.map(
  //                         ({ name, fieldSchema, labelIcon, metadatas, queryInfos }) => {
  //                           return (
  //                             <SelectWrapper
  //                               {...fieldSchema}
  //                               {...metadatas}
  //                               key={name}
  //                               labelIcon={labelIcon}
  //                               name={name}
  //                               relationsType={fieldSchema.relationType}
  //                               queryInfos={queryInfos}
  //                             />
  //                           );
  //                         }
  //                       )}
  //                     </div>
  //                   </SubWrapper>
  //                 )}
  //                 <LinkWrapper>
  //                   <ul>
  //                     <CheckPermissions permissions={configurationPermissions}>
  //                       <LiLink
  //                         message={{
  //                           id: 'app.links.configure-view',
  //                         }}
  //                         icon="layout"
  //                         url={configurationsURL}
  //                         onClick={() => {
  //                           // trackUsage('willEditContentTypeLayoutFromEditView');
  //                         }}
  //                       />
  //                     </CheckPermissions>
  //                     {slug !== 'strapi::administrator' && (
  //                       <CheckPermissions permissions={ctbPermissions}>
  //                         <LiLink
  //                           message={{
  //                             id: getTrad('containers.Edit.Link.Fields'),
  //                           }}
  //                           onClick={() => {
  //                             trackUsage('willEditEditLayout');
  //                           }}
  //                           icon="fa-cog"
  //                           url={`/plugins/content-type-builder/content-types/${slug}`}
  //                         />
  //                       </CheckPermissions>
  //                     )}
  //                     {/*  TODO add DOCUMENTATION */}
  //                     <InjectionZone area="contentManager.editView.right-links" slug={slug} />

  //                     {allowedActions.canDelete && (
  //                       <DeleteLink
  //                         isCreatingEntry={isCreatingEntry}
  //                         onDelete={onDelete}
  //                         onDeleteSucceeded={onDeleteSucceeded}
  //                       />
  //                     )}
  //                   </ul>
  //                 </LinkWrapper>
  //               </div>
  //             </div>
  //           </Container>
  //         </EditViewDataManagerProvider>
  //       );
  //     }}
  //   </DataManagementWrapper>
  // );
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
  layout: PropTypes.shape({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      uid: PropTypes.string.isRequired,
      settings: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      options: PropTypes.object.isRequired,
      attributes: PropTypes.object.isRequired,
    }).isRequired,
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
