import React, { memo, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { BackHeader, LiLink, CheckPermissions, useUserPermissions } from 'strapi-helper-plugin';
import { Padded } from '@buffetjs/core';

import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import { generatePermissionsObject } from '../../utils';
import Container from '../../components/Container';
import DynamicZone from '../../components/DynamicZone';
import FormWrapper from '../../components/FormWrapper';
import FieldComponent from '../../components/FieldComponent';
import Inputs from '../../components/Inputs';
import SelectWrapper from '../../components/SelectWrapper';
import getInjectedComponents from '../../utils/getComponents';
import EditViewDataManagerProvider from '../SingleTypeEditViewDataManagerProvider';
import EditViewProvider from '../EditViewProvider';
import Header from './Header';
import { createAttributesLayout, formatLayoutWithMetas } from './utils';
import { LinkWrapper, SubWrapper } from './components';

import DeleteLink from './DeleteLink';
import InformationCard from './InformationCard';

/* eslint-disable  react/no-array-index-key */

const EditView = ({
  components,
  currentEnvironment,
  deleteLayout,
  layouts,
  models,
  plugins,
  slug,
}) => {
  // TODO REFACTO THIS CONTAINER SINCE IT IS VERY SIMILAR TO THE CT ONE

  const { goBack } = useHistory();
  // DIFF WITH CT
  const { pathname } = useLocation();
  const viewPermissions = useMemo(() => generatePermissionsObject(slug), [slug]);
  const { allowedActions } = useUserPermissions(viewPermissions);

  const allLayoutData = useMemo(() => get(layouts, [slug], {}), [layouts, slug]);

  const currentContentTypeLayoutData = useMemo(() => get(allLayoutData, ['contentType'], {}), [
    allLayoutData,
  ]);

  const currentContentTypeLayoutRelations = useMemo(
    () => get(currentContentTypeLayoutData, ['layouts', 'editRelations'], []),
    [currentContentTypeLayoutData]
  );
  const currentContentTypeSchema = useMemo(
    () => get(currentContentTypeLayoutData, ['schema'], {}),
    [currentContentTypeLayoutData]
  );

  // Check if a block is a dynamic zone
  const isDynamicZone = useCallback(block => {
    return block.every(subBlock => {
      return subBlock.every(obj => obj.fieldSchema.type === 'dynamiczone');
    });
  }, []);

  useEffect(() => {
    return () => deleteLayout(slug);
  }, [deleteLayout, slug]);

  const formattedContentTypeLayout = useMemo(() => {
    const enhancedLayout = formatLayoutWithMetas(currentContentTypeLayoutData);

    return createAttributesLayout(enhancedLayout, currentContentTypeSchema.attributes);
  }, [currentContentTypeLayoutData, currentContentTypeSchema.attributes]);

  return (
    <EditViewProvider
      allowedActions={allowedActions}
      allLayoutData={allLayoutData}
      components={components}
      isSingleType
      layout={currentContentTypeLayoutData}
      models={models}
    >
      <EditViewDataManagerProvider
        allLayoutData={allLayoutData}
        redirectToPreviousPage={goBack}
        isSingleType
        slug={slug}
      >
        <BackHeader onClick={goBack} />
        <Container className="container-fluid">
          <Header />
          <div className="row" style={{ paddingTop: 3 }}>
            <div className="col-md-12 col-lg-9" style={{ marginBottom: 13 }}>
              {formattedContentTypeLayout.map((block, blockIndex) => {
                if (isDynamicZone(block)) {
                  const {
                    0: {
                      0: { name, fieldSchema },
                    },
                  } = block;

                  return (
                    <DynamicZone
                      key={blockIndex}
                      name={name}
                      max={fieldSchema.max}
                      min={fieldSchema.min}
                    />
                  );
                }

                return (
                  <FormWrapper key={blockIndex}>
                    {block.map((fieldsBlock, fieldsBlockIndex) => {
                      return (
                        <div className="row" key={fieldsBlockIndex}>
                          {fieldsBlock.map(
                            ({ name, size, fieldSchema, metadatas: { label } }, fieldIndex) => {
                              const isComponent = fieldSchema.type === 'component';

                              if (isComponent) {
                                const { component, max, min, repeatable = false } = fieldSchema;
                                const componentUid = fieldSchema.component;

                                return (
                                  <FieldComponent
                                    key={componentUid}
                                    componentUid={component}
                                    isRepeatable={repeatable}
                                    label={label}
                                    max={max}
                                    min={min}
                                    name={name}
                                  />
                                );
                              }

                              return (
                                <div className={`col-${size}`} key={name}>
                                  <Inputs
                                    autoFocus={
                                      blockIndex === 0 && fieldsBlockIndex === 0 && fieldIndex === 0
                                    }
                                    keys={name}
                                    layout={currentContentTypeLayoutData}
                                    name={name}
                                  />
                                </div>
                              );
                            }
                          )}
                        </div>
                      );
                    })}
                  </FormWrapper>
                );
              })}
            </div>
            <div className="col-md-12 col-lg-3">
              <InformationCard />
              <Padded size="smd" top />
              {currentContentTypeLayoutRelations.length > 0 && (
                <SubWrapper style={{ padding: '0 20px 1px', marginBottom: '25px' }}>
                  <div style={{ paddingTop: '22px' }}>
                    {currentContentTypeLayoutRelations.map(relationName => {
                      const relation = get(
                        currentContentTypeLayoutData,
                        ['schema', 'attributes', relationName],
                        {}
                      );
                      const relationMetas = get(
                        currentContentTypeLayoutData,
                        ['metadatas', relationName, 'edit'],
                        {}
                      );

                      return (
                        <SelectWrapper
                          {...relation}
                          {...relationMetas}
                          key={relationName}
                          name={relationName}
                          relationsType={relation.relationType}
                        />
                      );
                    })}
                  </div>
                </SubWrapper>
              )}
              <LinkWrapper>
                <ul>
                  {/* DIFF WITH CT */}
                  <CheckPermissions permissions={pluginPermissions.singleTypesConfigurations}>
                    <LiLink
                      message={{
                        id: 'app.links.configure-view',
                      }}
                      icon="layout"
                      key={`${pluginId}.link`}
                      // DIFF WITH CT
                      url={`${pathname}/ctm-configurations/edit-settings/content-types`}
                      onClick={() => {
                        // emitEvent('willEditContentTypeLayoutFromEditView');
                      }}
                    />
                  </CheckPermissions>
                  {getInjectedComponents(
                    'editView',
                    'right.links',
                    plugins,
                    currentEnvironment,
                    slug
                  )}
                  {allowedActions.canDelete && <DeleteLink />}
                </ul>
              </LinkWrapper>
            </div>
          </div>
        </Container>
      </EditViewDataManagerProvider>
    </EditViewProvider>
  );
};

EditView.defaultProps = {
  currentEnvironment: 'production',
  emitEvent: () => {},
  plugins: {},
};

EditView.propTypes = {
  components: PropTypes.array.isRequired,
  currentEnvironment: PropTypes.string,
  deleteLayout: PropTypes.func.isRequired,
  emitEvent: PropTypes.func,
  layouts: PropTypes.object.isRequired,
  models: PropTypes.array.isRequired,
  plugins: PropTypes.object,
  slug: PropTypes.string.isRequired,
};

export { EditView };
export default memo(EditView);
