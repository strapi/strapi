import { axiosInstance } from '../../../core/utils';

export const handleGuidedTourVisibility = async setUserShouldSeeGuidedTour => {
  const { data } = await axiosInstance.get('/admin/users/me');
  const isSuperAdmin = data.data.roles.find(elem => elem.name === 'Super Admin');

  setUserShouldSeeGuidedTour(!!isSuperAdmin);
};
