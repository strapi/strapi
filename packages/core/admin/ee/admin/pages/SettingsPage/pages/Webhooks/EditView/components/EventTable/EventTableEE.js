import React from 'react';

import EventTable from '../../../../../../../../../admin/src/pages/SettingsPage/pages/Webhooks/EditView/components/Events';

const events = {
  'review-workflows': ['review-workflows.create'],
};

const getHeaders = () => {
  return [{ id: 'workflows.updateEntryStage', defaultMessage: 'Stage Change' }];
};

export function EventTableEE() {
  return (
    <EventTable.Root
      renderChildren={({ isDraftAndPublish }) => (
        <>
          <EventTable.Headers isDraftAndPublish={isDraftAndPublish} />
          <EventTable.Body isDraftAndPublish={isDraftAndPublish} extraEvents={events} />
          <EventTable.Headers getHeaders={getHeaders} />
          <EventTable.Body providedEvents={events} />
        </>
      )}
    />
  );
}
