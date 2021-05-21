import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { useAppInfos } from '@strapi/helper-plugin';
import { Footer, Header, Loader, LinksContainer, LinksSection } from './compos';
import Wrapper from './Wrapper';
import useMenuSections from './useMenuSections';

const LeftMenu = ({ plugins, setUpdateMenu }) => {
  const location = useLocation();
  const { shouldUpdateStrapi } = useAppInfos();

  const {
    state: {
      isLoading,
      collectionTypesSectionLinks,
      singleTypesSectionLinks,
      generalSectionLinks,
      pluginsSectionLinks,
    },
    toggleLoading,
    generateMenu,
  } = useMenuSections(plugins, shouldUpdateStrapi);

  const filteredCollectionTypeLinks = collectionTypesSectionLinks.filter(
    ({ isDisplayed }) => isDisplayed
  );
  const filteredSingleTypeLinks = singleTypesSectionLinks.filter(({ isDisplayed }) => isDisplayed);

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

  console.log({ generalSectionLinks });

  return (
    <Wrapper>
      <Loader show={isLoading} />
      <Header />
      <LinksContainer>
        {filteredCollectionTypeLinks.length > 0 && (
          <LinksSection
            section="collectionType"
            name="collectionType"
            links={filteredCollectionTypeLinks}
            location={location}
            searchable
          />
        )}
        {filteredSingleTypeLinks.length > 0 && (
          <LinksSection
            section="singleType"
            name="singleType"
            links={filteredSingleTypeLinks}
            location={location}
            searchable
          />
        )}

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
  plugins: PropTypes.object.isRequired,
  setUpdateMenu: PropTypes.func.isRequired,
};

export default memo(LeftMenu);
