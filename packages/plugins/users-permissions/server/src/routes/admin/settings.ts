import { createProtectedRoute } from './create-protected-route';

export default [
  createProtectedRoute(
    'GET',
    '/email-templates',
    'settings.getEmailTemplate',
    'email-templates.read'
  ),
  createProtectedRoute(
    'PUT',
    '/email-templates',
    'settings.updateEmailTemplate',
    'email-templates.update'
  ),
  createProtectedRoute(
    'GET',
    '/advanced',
    'settings.getAdvancedSettings',
    'advanced-settings.read'
  ),
  createProtectedRoute(
    'PUT',
    '/advanced',
    'settings.updateAdvancedSettings',
    'advanced-settings.update'
  ),
  createProtectedRoute('GET', '/providers', 'settings.getProviders', 'providers.read'),
  createProtectedRoute('PUT', '/providers', 'settings.updateProviders', 'providers.update'),
];
