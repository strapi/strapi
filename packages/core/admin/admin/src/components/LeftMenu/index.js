import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppInfos, useStrapiApp } from '@strapi/helper-plugin';
import { Footer, Header, Loader, LinksContainer, LinksSection } from './compos';
import Wrapper from './Wrapper';
import useMenuSections from './useMenuSections';

const LeftMenu = () => {
  const location = useLocation();
  const { shouldUpdateStrapi } = useAppInfos();
  const { plugins } = useStrapiApp();
  const { isLoading, generalSectionLinks, pluginsSectionLinks } = useMenuSections(
    plugins,
    shouldUpdateStrapi
  );

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

export default memo(LeftMenu);
