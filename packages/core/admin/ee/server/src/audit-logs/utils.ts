interface AdminUserLike {
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email: string;
}

/** How an admin user is named across audit logs */
const getDisplayName = (user: AdminUserLike): string => {
  if (user.username) {
    return user.username;
  }

  if (user.firstname && user.lastname) {
    return `${user.firstname} ${user.lastname}`;
  }

  return user.email;
};

export { getDisplayName };
