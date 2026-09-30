import * as React from 'react';

import { Events } from '../../../../../../../../admin/src/pages/Settings/pages/Webhooks/components/Events';

import type { Modules } from '@strapi/types';

const eeTables = {
  'review-workflows': {
    'review-workflows': ['review-workflows.updateEntryStage'],
  },
  releases: {
    releases: ['releases.publish'],
  },
};

const eeTableFeatures = {
  'review-workflows': 'review-workflows',
  releases: 'cms-content-releases',
} satisfies Record<keyof typeof eeTables, Modules.EE.FeatureName>;

const getHeaders = (table: keyof typeof eeTables) => {
  switch (table) {
    case 'review-workflows':
      return () => [{ id: 'review-workflows.updateEntryStage', defaultMessage: 'Stage Change' }];
    case 'releases':
      return () => [{ id: 'releases.publish', defaultMessage: 'Publish' }];
  }
};

const EventsTableEE = () => {
  const tables = (Object.keys(eeTables) as Array<keyof typeof eeTables>).filter((table) =>
    window.strapi.features.isEnabled(eeTableFeatures[table])
  );

  return (
    <Events.Root>
      <Events.Headers />
      <Events.Body />
      {tables.map((table) => (
        <React.Fragment key={table}>
          <Events.Headers getHeaders={getHeaders(table)} />
          <Events.Body providedEvents={eeTables[table]} />
        </React.Fragment>
      ))}
    </Events.Root>
  );
};

export { EventsTableEE };
