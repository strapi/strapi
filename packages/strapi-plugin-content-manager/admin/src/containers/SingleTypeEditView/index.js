import React, { memo, useCallback, useMemo, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
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
import createAttributesLayout from './utils/createAttributesLayout';
import { LinkWrapper, SubWrapper } from './components';
import init from './init';
import reducer, { initialState } from './reducer';
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
  const formatLayoutRef = useRef();
  formatLayoutRef.current = createAttributesLayout;
  const { goBack } = useHistory();

  // Retrieve the search and the pathname
  const { pathname } = useLocation();
  const {
    params: { contentType },
  } = useRouteMatch('/plugins/content-manager/:contentType');
  const viewPermissions = useMemo(() => generatePermissionsObject(slug), [slug]);
  const { allowedActions } = useUserPermissions(viewPermissions);

  const isSingleType = useMemo(() => contentType === 'singleType', [contentType]);
  const [{ formattedContentTypeLayout }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState)
  );
  const allLayoutData = useMemo(() => get(layouts, [slug], {}), [layouts, slug]);
  const currentContentTypeLayoutData = useMemo(() => get(allLayoutData, ['contentType'], {}), [
    allLayoutData,
  ]);
  const currentContentTypeLayout = useMemo(
    () => get(currentContentTypeLayoutData, ['layouts', 'edit'], []),
    [currentContentTypeLayoutData]
  );
  const currentContentTypeLayoutRelations = useMemo(
    () => get(currentContentTypeLayoutData, ['layouts', 'editRelations'], []),
    [currentContentTypeLayoutData]
  );
  const currentContentTypeSchema = useMemo(
    () => get(currentContentTypeLayoutData, ['schema'], {}),
    [currentContentTypeLayoutData]
  );

  const getFieldMetas = useCallback(
    fieldName => {
      return get(currentContentTypeLayoutData, ['metadatas', fieldName, 'edit'], {});
    },
    [currentContentTypeLayoutData]
  );
  const getField = useCallback(
    fieldName => {
      return get(currentContentTypeSchema, ['attributes', fieldName], {});
    },
    [currentContentTypeSchema]
  );
  const getFieldType = useCallback(
    fieldName => {
      return get(getField(fieldName), ['type'], '');
    },
    [getField]
  );
  const getFieldComponentUid = useCallback(
    fieldName => {
      return get(getField(fieldName), ['component'], '');
    },
    [getField]
  );

  // Check if a block is a dynamic zone
  const isDynamicZone = useCallback(
    block => {
      return block.every(subBlock => {
        return subBlock.every(obj => getFieldType(obj.name) === 'dynamiczone');
      });
    },
    [getFieldType]
  );

  useEffect(() => {
    // Force state to be cleared when navigation from one entry to another
    dispatch({ type: 'RESET_PROPS' });
    dispatch({
      type: 'SET_LAYOUT_DATA',
      formattedContentTypeLayout: formatLayoutRef.current(
        currentContentTypeLayout,
        currentContentTypeSchema.attributes
      ),
    });

    return () => deleteLayout(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentContentTypeLayout, currentContentTypeSchema.attributes]);

  return (
    <EditViewProvider
      allowedActions={allowedActions}
      allLayoutData={allLayoutData}
      components={components}
      isSingleType={isSingleType}
      layout={currentContentTypeLayoutData}
      models={models}
    >
      <EditViewDataManagerProvider
        allLayoutData={allLayoutData}
        redirectToPreviousPage={goBack}
        isSingleType={isSingleType}
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
                      0: { name },
                    },
                  } = block;
                  const { max, min } = getField(name);

                  return <DynamicZone key={blockIndex} name={name} max={max} min={min} />;
                }

                return (
                  <FormWrapper key={blockIndex}>
                    {block.map((fieldsBlock, fieldsBlockIndex) => {
                      return (
                        <div className="row" key={fieldsBlockIndex}>
                          {fieldsBlock.map(({ name, size }, fieldIndex) => {
                            const isComponent = getFieldType(name) === 'component';

                            if (isComponent) {
                              const componentUid = getFieldComponentUid(name);
                              const isRepeatable = get(getField(name), 'repeatable', false);
                              const { max, min } = getField(name);

                              const label = get(getFieldMetas(name), 'label', componentUid);

                              return (
                                <FieldComponent
                                  key={componentUid}
                                  componentUid={componentUid}
                                  isRepeatable={isRepeatable}
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
                          })}
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
                  <CheckPermissions
                    permissions={
                      isSingleType
                        ? pluginPermissions.singleTypesConfigurations
                        : pluginPermissions.collectionTypesConfigurations
                    }
                  >
                    <LiLink
                      message={{
                        id: 'app.links.configure-view',
                      }}
                      icon="layout"
                      key={`${pluginId}.link`}
                      url={`${
                        isSingleType ? `${pathname}/` : ''
                      }ctm-configurations/edit-settings/content-types`}
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
