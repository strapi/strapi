import { createProtectedRoute } from './create-protected-route';

export default [
  createProtectedRoute('GET', '/roles/:id', 'role.findOne', 'roles.read'),
  createProtectedRoute('GET', '/roles', 'role.find', 'roles.read'),
  createProtectedRoute('POST', '/roles', 'role.createRole', 'roles.create'),
  createProtectedRoute('PUT', '/roles/:role', 'role.updateRole', 'roles.update'),
  createProtectedRoute('DELETE', '/roles/:role', 'role.deleteRole', 'roles.delete'),
];
