import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import {
  LeftMenuLinksSection,
  LeftMenuFooter,
  LeftMenuHeader,
  LinksContainer,
} from '../../components/LeftMenu';
import Loader from './Loader';
import Wrapper from './Wrapper';
import useMenuSections from './useMenuSections';

const LeftMenu = ({ shouldUpdateStrapi, version, plugins }) => {
  const location = useLocation();

  const {
    isLoading,
    collectionTypesSectionLinks,
    singleTypesSectionLinks,
    generalSectionLinks,
    pluginsSectionLinks,
  } = useMenuSections(plugins, shouldUpdateStrapi);

  const filteredSingleTypeLinks = useMemo(
    () => singleTypesSectionLinks.filter(({ isDisplayed }) => isDisplayed),
    [singleTypesSectionLinks]
  );

  return (
    <Wrapper>
      <Loader show={isLoading} />
      <LeftMenuHeader />
      <LinksContainer>
        {collectionTypesSectionLinks.length > 0 && (
          <LeftMenuLinksSection
            section="collectionType"
            name="collectionType"
            links={collectionTypesSectionLinks}
            location={location}
            searchable
          />
        )}
        {filteredSingleTypeLinks.length > 0 && (
          <LeftMenuLinksSection
            section="singleType"
            name="singleType"
            links={filteredSingleTypeLinks}
            location={location}
            searchable
          />
        )}

        {pluginsSectionLinks.length > 0 && (
          <LeftMenuLinksSection
            section="plugins"
            name="plugins"
            links={pluginsSectionLinks}
            location={location}
            searchable={false}
            emptyLinksListMessage="app.components.LeftMenuLinkContainer.noPluginsInstalled"
          />
        )}
        {generalSectionLinks.length > 0 && (
          <LeftMenuLinksSection
            section="general"
            name="general"
            links={generalSectionLinks}
            location={location}
            searchable={false}
          />
        )}
      </LinksContainer>
      <LeftMenuFooter key="footer" version={version} />
    </Wrapper>
  );
};

LeftMenu.propTypes = {
  shouldUpdateStrapi: PropTypes.bool.isRequired,
  version: PropTypes.string.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default memo(LeftMenu);
