import { request } from '@strapi/helper-plugin';
import pluginId from '../../../pluginId';

const deleteDoc = ({ prefix, version }) => {
  return request(`${prefix}/deleteDoc/${version}`, { method: 'DELETE' });
};

const fetchData = async toggleNotification => {
  try {
    const data = await request(`/${pluginId}/getInfos`, { method: 'GET' });

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    // FIXME
    return null;
  }
};

const regenerateDoc = ({ prefix, version }) => {
  return request(`${prefix}/regenerateDoc`, { method: 'POST', body: { version } });
};

const submit = ({ prefix, body }) => request(`${prefix}/updateSettings`, { method: 'PUT', body });

export { deleteDoc, fetchData, regenerateDoc, submit };
