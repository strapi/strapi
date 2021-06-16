import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { Footer, Header, LinksContainer, LinksSection, SectionTitle } from './compos';
import Wrapper from './Wrapper';

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }) => {
  const location = useLocation();

  return (
    <Wrapper>
      <Header />
      <LinksContainer>
        {pluginsSectionLinks.length > 0 && (
          <>
            <SectionTitle>
              <FormattedMessage
                id="app.components.LeftMenuLinkContainer.listPlugins"
                defaultMessage="Plugins"
              />
            </SectionTitle>
            <LinksSection
              links={pluginsSectionLinks}
              location={location}
              searchable={false}
              emptyLinksListMessage="app.components.LeftMenuLinkContainer.noPluginsInstalled"
            />
          </>
        )}
        {generalSectionLinks.length > 0 && (
          <>
            <SectionTitle>
              <FormattedMessage
                id="app.components.LeftMenuLinkContainer.general"
                defaultMessage="General"
              />
            </SectionTitle>
            <LinksSection links={generalSectionLinks} location={location} searchable={false} />
          </>
        )}
      </LinksContainer>
      <Footer key="footer" />
    </Wrapper>
  );
};

LeftMenu.propTypes = {
  generalSectionLinks: PropTypes.array.isRequired,
  pluginsSectionLinks: PropTypes.array.isRequired,
};

export default memo(LeftMenu);
