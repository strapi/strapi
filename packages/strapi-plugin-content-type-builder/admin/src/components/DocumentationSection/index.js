/**
 *
 * DocumentationSection
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';

const getTradId = suffix => `${pluginId}.menu.section.documentation.${suffix}`;

const DocumentationSection = () => (
  <ul
    style={{ marginTop: '2rem', paddingLeft: '2.5rem', lineHeight: '1.8rem' }}
  >
    <li>
      <FormattedMessage id={getTradId('guide')} />
      &nbsp;
      <FormattedMessage id={getTradId('guideLink')}>
        {message => (
          <a
            href="http://strapi.io/documentation/3.0.0-beta.x/guides/models.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            {message}
          </a>
        )}
      </FormattedMessage>
    </li>
  </ul>
);

export default DocumentationSection;
