/**
 *
 * DocumentationSection
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

const DocumentationSection = () => (
  <ul
    style={{ marginTop: '2rem', paddingLeft: '2.5rem', lineHeight: '1.8rem' }}
  >
    <li>
      <FormattedMessage id="content-type-builder.menu.section.documentation.guide" />
      &nbsp;
      <FormattedMessage id="content-type-builder.menu.section.documentation.guideLink">
        {message => (
          <a
            href="http://strapi.io/documentation/3.0.0-beta.x/guides/models.html"
            target="_blank"
          >
            {message}
          </a>
        )}
      </FormattedMessage>
    </li>
  </ul>
);

export default DocumentationSection;
