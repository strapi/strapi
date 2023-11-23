import { Events } from '../../../../../../../../admin/src/pages/Settings/pages/Webhooks/components/Events';

const events = {
  'review-workflows': ['review-workflows.updateEntryStage'],
};

const getHeaders = () => {
  return [{ id: 'review-workflows.updateEntryStage', defaultMessage: 'Stage Change' }];
};

const EventsTableEE = () => {
  return (
    <Events.Root>
      <Events.Headers />
      <Events.Body />
      <Events.Headers getHeaders={getHeaders} />
      <Events.Body providedEvents={events} />
    </Events.Root>
  );
};

export { EventsTableEE };
