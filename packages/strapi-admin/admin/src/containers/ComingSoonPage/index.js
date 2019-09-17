/*
 *
 * ComingSoonPage
 *
 */

import React from 'react';
import { PluginHeader } from 'strapi-helper-plugin';
import PageTitle from '../../components/PageTitle';

const ComingSoonPage = () => {
  return (
    <div>
      <PageTitle title="Coming soon" />
      <div>
        <div
          className="container-fluid"
          style={{ padding: '18px 30px', overflow: 'hidden' }}
        >
          <PluginHeader
            title={{
              id: 'app.components.ComingSoonPage.comingSoon',
            }}
            description={{
              id: 'app.components.ComingSoonPage.featuresNotAvailable',
            }}
            actions={[]}
          />
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
