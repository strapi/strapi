import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { BaselineAlignment } from '@strapi/helper-plugin';
import { Footer, Header, LinksContainer, LinksSection, SectionTitle } from './compos';
import LeftMenuLink from './compos/Link';

import Wrapper from './Wrapper';

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }) => {
  return (
    <Wrapper>
      <Header />

      <LinksContainer>
        <BaselineAlignment top size="16px" />
        <LeftMenuLink
          to="/plugins/content-manager"
          icon="book-open"
          intlLabel={{
            id: `content-manager.plugin.name`,
            defaultMessage: 'Content manager',
          }}
        />
        <BaselineAlignment bottom size="2px" />

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
            <LinksSection links={generalSectionLinks} searchable={false} />
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
