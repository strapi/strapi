import React from 'react';

import EventTable from '../../../../../../../../../admin/src/pages/SettingsPage/pages/Webhooks/EditView/components/Events';

const events = {
  'review-workflows': ['review-workflows.updateEntryStage'],
};

const getHeaders = () => {
  return [{ id: 'review-workflows.updateEntryStage', defaultMessage: 'Stage Change' }];
};

export function EventTableEE() {
  return (
    <EventTable.Root>
      <EventTable.Headers />
      <EventTable.Body />
      <EventTable.Headers getHeaders={getHeaders} />
      <EventTable.Body providedEvents={events} />
    </EventTable.Root>
  );
}
