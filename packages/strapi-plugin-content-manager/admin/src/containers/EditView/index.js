import React, {
  memo,
  useCallback,
  useMemo,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { BackHeader, getQueryParameters, LiLink } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { EditViewProvider } from '../../contexts/EditView';
import Container from '../../components/Container';
import DynamicZone from '../../components/DynamicZone';
import FormWrapper from '../../components/FormWrapper';
// import ComponentField from '../../components/ComponentField';
import Inputs from '../../components/Inputs';
import SelectWrapper from '../../components/SelectWrapper';
import EditViewDataManagerProvider from '../EditViewDataManagerProvider';
import Header from './Header';
import getInjectedComponents from './utils/getComponents';
import init from './init';
import reducer, { initialState } from './reducer';
import { LinkWrapper, SubWrapper } from './components';
import createAttributesLayout from './utils/createAttributesLayout';

const EditView = ({
  currentEnvironment,
  emitEvent,
  layouts,
  plugins,
  slug,
}) => {
  const formatLayoutRef = useRef();
  formatLayoutRef.current = createAttributesLayout;
  // Retrieve push to programmatically navigate between views
  const { push } = useHistory();
  // Retrieve the search
  const { search } = useLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState)
  );
  const allLayoutData = useMemo(() => get(layouts, [slug], {}), [
    layouts,
    slug,
  ]);
  const currentContentTypeLayoutData = useMemo(
    () => get(allLayoutData, ['contentType'], {}),
    [allLayoutData]
  );
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
  const source = getQueryParameters(search, 'source');
  const getFieldType = useCallback(
    fieldName => {
      return get(
        currentContentTypeSchema,
        ['attributes', fieldName, 'type'],
        ''
      );
    },
    [currentContentTypeSchema]
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
  }, [currentContentTypeLayout, currentContentTypeSchema.attributes]);

  const { formattedContentTypeLayout } = reducerState.toJS();

  // We can't use the getQueryParameters helper here because the search
  // can contain 'redirectUrl' several times since we can navigate between documents
  const redirectURL = search
    .split('redirectUrl=')
    .filter((_, index) => index !== 0)
    .join('');
  const redirectToPreviousPage = () => push(redirectURL);

  return (
    <EditViewProvider layout={currentContentTypeLayoutData}>
      <EditViewDataManagerProvider
        allLayoutData={allLayoutData}
        redirectToPreviousPage={redirectToPreviousPage}
        slug={slug}
      >
        <BackHeader onClick={() => redirectToPreviousPage()} />
        <Container className="container-fluid">
          <Header />
          <div className="row">
            <div className="col-md-12 col-lg-9">
              {formattedContentTypeLayout.map((block, blockIndex) => {
                if (isDynamicZone(block)) {
                  const {
                    0: {
                      0: { name },
                    },
                  } = block;

                  return <DynamicZone key={blockIndex} name={name} />;
                }

                return (
                  <FormWrapper key={blockIndex}>
                    {block.map((fieldsBlock, fieldsBlockIndex) => {
                      return (
                        <div className="row" key={fieldsBlockIndex}>
                          {fieldsBlock.map(({ name, size }, fieldIndex) => {
                            const isComponent =
                              getFieldType(name) === 'component';

                            if (isComponent) {
                              return (
                                <div className={`col-${size}`} key={name}>
                                  COMPONENT: {name}
                                </div>
                              );
                            }

                            return (
                              <div className={`col-${size}`} key={name}>
                                <Inputs
                                  autoFocus={
                                    blockIndex === 0 &&
                                    fieldsBlockIndex === 0 &&
                                    fieldIndex === 0
                                  }
                                  keys={name}
                                  layout={currentContentTypeLayoutData}
                                  name={name}
                                  onChange={() => {}}
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
              {currentContentTypeLayoutRelations.length > 0 && (
                <SubWrapper
                  style={{ padding: '0 20px 1px', marginBottom: '26px' }}
                >
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
                  <LiLink
                    message={{
                      id: 'app.links.configure-view',
                    }}
                    icon="layout"
                    key={`${pluginId}.link`}
                    // url={`/plugins/${pluginId}/ctm-configurations/edit-settings/content-types/${slug}${`?source=${source}`}`}
                    url={`ctm-configurations/edit-settings/content-types${`?source=${source}`}`}
                    onClick={() => {
                      // emitEvent('willEditContentTypeLayoutFromEditView');
                    }}
                  />
                  {getInjectedComponents(
                    'right.links',
                    plugins,
                    currentEnvironment,
                    slug,
                    source,
                    emitEvent
                  )}
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
  currentEnvironment: PropTypes.string,
  emitEvent: PropTypes.func,
  layouts: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
  plugins: PropTypes.object,
};

export { EditView };
export default memo(EditView);
