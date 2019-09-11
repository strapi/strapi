import React, { useEffect } from 'react';
import { get } from 'lodash';
import { Switch, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  LoadingIndicatorPage,
  StyledLeftMenu,
  ViewContainer,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import useFetch from '../../hooks/useFetch';
import MenuSection from '../../components/MenuSection';
import ConfigPage from '../ConfigPage';
import EnvConfigPage from '../EnvConfigPage';
import LanguagePage from '../LanguagePage';
/* eslint-disable */
const Main = ({
  global: { currentEnvironment },
  history: { push },
  location: { pathname },
}) => {
  const { data, isLoading } = useFetch(['menu', 'configurations/environments']);

  useEffect(() => {
    if (pathname.split('/').length === 3 && !isLoading) {
      const firstLink = get(
        data,
        [0, 'sections', 0, 'items', 0, 'slug'],
        'application'
      );
      push(`/plugins/${pluginId}/${firstLink}`);
    }
  }, [pathname, isLoading]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }
  const [{ sections: menuSections }, { environments }] = data;

  return (
    <ViewContainer>
      <div className="container-fluid">
        <div className="row">
          <StyledLeftMenu className="col-3">
            {menuSections.map((section, index) => (
              <MenuSection
                key={section.name}
                currentEnvironment={currentEnvironment}
                {...section}
                withEnv={index > 0}
              />
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
                <Route
                  path={`/plugins/${pluginId}/:slug`}
                  component={ConfigPage}
                  exact
                />
                <Route
                  path={`/plugins/${pluginId}/:slug/:env`}
                  component={EnvConfigPage}
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
