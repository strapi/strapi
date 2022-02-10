import axiosInstance from '../../../utils/axiosInstance';
import pluginId from '../../../pluginId';

export const fetchContentTypes = async () => {
  try {
    const {
      data: { data },
    } = await axiosInstance.get('/content-manager/content-types');

    // Only display content types that are managed by the CM
    return data.filter(({ isDisplayed }) => isDisplayed);
  } catch (err) {
    throw new Error(err);
  }
};

export const fetchSettings = async () => {
  try {
    const {
      data: { data },
    } = await axiosInstance.get(`/${pluginId}/settings`);

    return data;
  } catch (error) {
    throw new Error(error);
  }
};

export const putSettings = body => axiosInstance.put(`/${pluginId}/content-sync-url`, body);
