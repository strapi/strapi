const retrieveNonAdminUsers = (usersToDelete, adminUsersToDelete) =>
  usersToDelete.filter(id => {
    const index = adminUsersToDelete.findIndex(adminId => adminId.toString() === id.toString());

    return index === -1;
  });

export default retrieveNonAdminUsers;
