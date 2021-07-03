import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { useAppInfos, useStrapiApp } from '@strapi/helper-plugin';
import { Footer, Header, Loader, LinksContainer, LinksSection } from './compos';
import Wrapper from './Wrapper';
import useMenuSections from './useMenuSections';

const LeftMenu = ({ setUpdateMenu }) => {
  const location = useLocation();
  const { shouldUpdateStrapi } = useAppInfos();
  const { plugins } = useStrapiApp();
  const {
    state: { isLoading, generalSectionLinks, pluginsSectionLinks },
    toggleLoading,
    generateMenu,
  } = useMenuSections(plugins, shouldUpdateStrapi);

  // This effect is really temporary until we create the menu api
  // We need this because we need to regenerate the links when the settings are being changed
  // in the content manager configurations list
  useEffect(() => {
    setUpdateMenu(() => {
      toggleLoading();
      generateMenu();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper>
      <Loader show={isLoading} />
      <Header />
      <LinksContainer>
        {pluginsSectionLinks.length > 0 && (
          <LinksSection
            section="plugins"
            name="plugins"
            links={pluginsSectionLinks}
            location={location}
            searchable={false}
            emptyLinksListMessage="app.components.LeftMenuLinkContainer.noPluginsInstalled"
          />
        )}
        {generalSectionLinks.length > 0 && (
          <LinksSection
            section="general"
            name="general"
            links={generalSectionLinks}
            location={location}
            searchable={false}
          />
        )}
      </LinksContainer>
      <Footer key="footer" />
    </Wrapper>
  );
};

LeftMenu.propTypes = {
  setUpdateMenu: PropTypes.func.isRequired,
};

export default memo(LeftMenu);
