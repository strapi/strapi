export const handleGuidedTourVisibility = (roles, setUserShouldSeeGuidedTour) => {
  const isSuperAdmin = roles.find(elem => elem.name === 'Super Admin');

  setUserShouldSeeGuidedTour(!!isSuperAdmin);
};
