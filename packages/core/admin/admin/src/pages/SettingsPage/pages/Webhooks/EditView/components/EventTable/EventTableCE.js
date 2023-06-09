import React from 'react';

import EventTable from '../Events';

// This component is overwritten by the EE counterpart
export function EventTableCE() {
  return (
    <EventTable.Root>
      <EventTable.Headers />
      <EventTable.Body />
    </EventTable.Root>
  );
}
