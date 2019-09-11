import React, { useEffect, useState } from 'react';
import { get } from 'lodash';
import { Switch, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  LoadingIndicatorPage,
  request,
  StyledLeftMenu,
  ViewContainer,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import MenuSection from '../../components/MenuSection';
import LanguagePage from '../LanguagePage';
/* eslint-disable */
const Main = ({
  global: { currentEnvironment },
  history: { push },
  location: { pathname },
}) => {
  const [{ menuSections, environments, isLoading }, setState] = useState({
    menuSections: [],
    environments: [],
    isLoading: true,
  });
  const abortController = new AbortController();
  const { signal } = abortController;

  useEffect(() => {
    const getData = async () => {
      try {
        const endPoints = ['menu', 'configurations/environments'];
        const [
          { sections: menuSections },
          { environments },
        ] = await Promise.all(
          endPoints.map(endPoint =>
            request(`/${pluginId}/${endPoint}`, { method: 'GET', signal })
          )
        );

        // Redirect to first link item
        if (pathname.split('/').length === 3) {
          const firstLink = get(
            menuSections,
            [0, 'items', 0, 'slug'],
            'application'
          );

          push(`/plugins/${pluginId}/${firstLink}`);
        }

        setState({ menuSections, environments, isLoading: false });
      } catch (err) {
        strapi.notification.error(`${pluginId}.strapi.notification.error`);
      }
    };

    getData();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  // console.log({ menuSections });

  return (
    <ViewContainer>
      <div className="container-fluid">
        <div className="row">
          <StyledLeftMenu className="col-3">
            {menuSections.map(section => (
              <MenuSection key={section.name} {...section} />
            ))}
          </StyledLeftMenu>
          <div className="col-9">
            <div className="components-container">
              <Switch>
                <Route
                  path={`/plugins/${pluginId}/languages`}
                  component={LanguagePage}
                  exact
                />
              </Switch>
            </div>
          </div>
        </div>
      </div>
    </ViewContainer>
  );
};

Main.propTypes = {
  global: PropTypes.shape({
    currentEnvironment: PropTypes.string.isRequired,
  }),
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }),
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }),
};

export default Main;
