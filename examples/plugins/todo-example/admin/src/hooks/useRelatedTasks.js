import * as React from 'react';
import {
  useFetchClient,
  unstable_useContentManagerContext as useContentManagerContext,
} from '@strapi/strapi/admin';

function useRelatedTasks() {
  const fetchClient = useFetchClient();

  const { model, id, isSingleType } = useContentManagerContext();

  const [status, setStatus] = React.useState('loading');
  const [tasks, setTasks] = React.useState([]);

  const refetchTasks = React.useCallback(async () => {
    try {
      const { data } = await fetchClient.get(
        `/todo/tasks/${model}?documentId=${isSingleType ? '' : id}`
      );

      setTasks(data);
      setStatus('success');
    } catch (e) {
      setStatus('error');
    }
  }, [fetchClient, id, isSingleType, model]);

  React.useEffect(() => {
    refetchTasks();
  }, [id, isSingleType, setTasks, setStatus, refetchTasks]);

  return { status, tasks, refetchTasks };
}

export default useRelatedTasks;
