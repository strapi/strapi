'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/roles/:id',
    handler: 'role.getRole',
  },
  {
    method: 'GET',
    path: '/roles',
    handler: 'role.getRoles',
  },
  {
    method: 'POST',
    path: '/roles',
    handler: 'role.createRole',
  },
  {
    method: 'PUT',
    path: '/roles/:role',
    handler: 'role.updateRole',
  },
  {
    method: 'DELETE',
    path: '/roles/:role',
    handler: 'role.deleteRole',
  },
];
