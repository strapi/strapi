import React, { memo, useMemo } from 'react';
import { Switch, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { LoadingIndicatorPage, CheckPagePermissions } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import { ContentTypeLayoutContext } from '../../contexts';
import { useFetchContentTypeLayout } from '../../hooks';
import { formatLayoutToApi } from '../../utils';
import EditView from '../EditView';
import EditSettingsView from '../EditSettingsView';

const SingleTypeRecursivePath = ({
  match: {
    params: { slug },
    url,
  },
}) => {
  const { isLoading, layout, updateLayout } = useFetchContentTypeLayout(slug);

  const { rawContentTypeLayout, rawComponentsLayouts } = useMemo(() => {
    let rawComponentsLayouts = {};
    let rawContentTypeLayout = {};

    if (layout.contentType) {
      rawContentTypeLayout = formatLayoutToApi(layout.contentType);
    }

    if (layout.components) {
      rawComponentsLayouts = Object.keys(layout.components).reduce((acc, current) => {
        acc[current] = formatLayoutToApi(layout.components[current]);

        return acc;
      }, {});
    }

    return { rawContentTypeLayout, rawComponentsLayouts };
  }, [layout]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <ContentTypeLayoutContext.Provider value={layout}>
      <Switch>
        <Route path={`${url}/configurations/edit`}>
          <CheckPagePermissions permissions={pluginPermissions.singleTypesConfigurations}>
            <EditSettingsView
              components={rawComponentsLayouts}
              isContentTypeView
              mainLayout={rawContentTypeLayout}
              slug={slug}
              updateLayout={updateLayout}
            />
          </CheckPagePermissions>
        </Route>
        <Route
          path={url}
          render={({ location: { state }, history: { goBack } }) => {
            return (
              <EditView layout={layout} slug={slug} isSingleType state={state} goBack={goBack} />
            );
          }}
        />
      </Switch>
    </ContentTypeLayoutContext.Provider>
  );
};

SingleTypeRecursivePath.propTypes = {
  match: PropTypes.shape({
    url: PropTypes.string.isRequired,
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};
export default memo(SingleTypeRecursivePath);
