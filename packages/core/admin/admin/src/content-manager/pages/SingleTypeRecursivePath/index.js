import React, { memo, useMemo } from 'react';

import { CheckPagePermissions, LoadingIndicatorPage } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import { selectAdminPermissions } from '../../../pages/App/selectors';
import { ContentTypeLayoutContext } from '../../contexts';
import { useFetchContentTypeLayout } from '../../hooks';
import { formatLayoutToApi } from '../../utils';
import EditSettingsView from '../EditSettingsView';
import EditViewLayoutManager from '../EditViewLayoutManager';

const SingleTypeRecursivePath = ({
  match: {
    params: { slug },
    url,
  },
}) => {
  const permissions = useSelector(selectAdminPermissions);
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
          <CheckPagePermissions permissions={permissions.contentManager.singleTypesConfigurations}>
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
              <EditViewLayoutManager
                layout={layout}
                slug={slug}
                isSingleType
                state={state}
                goBack={goBack}
              />
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
