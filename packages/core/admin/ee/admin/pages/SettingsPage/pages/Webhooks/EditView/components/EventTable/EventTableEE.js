import React from 'react';

import EventTable from '../../../../../../../../../admin/src/pages/SettingsPage/pages/Webhooks/EditView/components/Events';

const events = {
  'review-workflows': ['review-workflows.create'],
};

const getHeaders = () => {
  return [{ id: 'TBD', defaultMessage: 'Stage Change' }];
};

export function EventTableEE() {
  return (
    <EventTable.Root>
      <EventTable.Headers />
      <EventTable.Body extraEvents={events} />
      <EventTable.Headers getHeaders={getHeaders} />
      <EventTable.Body providedEvents={events} />
    </EventTable.Root>
  );
}
