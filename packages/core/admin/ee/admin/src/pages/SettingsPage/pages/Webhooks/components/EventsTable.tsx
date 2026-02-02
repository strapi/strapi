import { Events } from '../../../../../../../../admin/src/pages/Settings/pages/Webhooks/components/Events';

const eeTables = {
  'review-workflows': {
    'review-workflows': ['review-workflows.updateEntryStage'],
  },
  releases: {
    releases: ['releases.publish'],
  },
};

const getHeaders = (table: keyof typeof eeTables) => {
  switch (table) {
    case 'review-workflows':
      return () => [{ id: 'review-workflows.updateEntryStage', defaultMessage: 'Stage Change' }];
    case 'releases':
      return () => [{ id: 'releases.publish', defaultMessage: 'Publish' }];
  }
};

const EventsTableEE = () => {
  return (
    <Events.Root>
      <Events.Headers />
      <Events.Body />
      {(Object.keys(eeTables) as Array<keyof typeof eeTables>).map((table) => (
        <>
          <Events.Headers getHeaders={getHeaders(table)} />
          <Events.Body providedEvents={eeTables[table]} />
        </>
      ))}
    </Events.Root>
  );
};

export { EventsTableEE };
