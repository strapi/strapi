const retrieveAdminUsers = (arrayToFilter, refArray) =>
  arrayToFilter.filter(id => {
    const user = refArray.find(user => user.id.toString() === id.toString());
    const hasAdminRole = user.roles.filter(role => role.code === 'strapi-super-admin').length > 0;

    return hasAdminRole;
  });

export default retrieveAdminUsers;
