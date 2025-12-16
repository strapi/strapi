import type { Permission } from '../../../../shared/contracts/shared';

/**
 * Maps admin permissions to content API permissions
 * 
 * Admin permissions use format: plugin::content-manager.explorer.<action>
 * Content API permissions use format: api::<content-type>.<content-type>.<action>
 * 
 * This function converts admin permissions to content API format for use
 * with the content API permission engine.
 */
export const mapAdminPermissionsToContentAPI = (
  adminPermissions: Permission[]
): Array<{ action: string }> => {
  const contentAPIPermissions: Array<{ action: string }> = [];

  for (const permission of adminPermissions) {
    const { action, subject } = permission;

    // Only map content-manager explorer permissions
    if (!action.startsWith('plugin::content-manager.explorer.')) {
      continue;
    }

    // Extract the action type (read, create, update, delete, publish)
    const actionType = action.replace('plugin::content-manager.explorer.', '');

    // Skip if no subject (content type)
    if (!subject) {
      continue;
    }

    // Map admin actions to content API actions
    const actionMap: Record<string, string[]> = {
      read: ['find', 'findOne'],
      create: ['create'],
      update: ['update'],
      delete: ['delete'],
      publish: ['publish'],
    };

    const contentAPIActions = actionMap[actionType];
    if (!contentAPIActions) {
      continue;
    }

    // Create content API permission actions
    // Format: api::<content-type>.<content-type>.<action>
    // Subject format is already api::<content-type>.<content-type>
    for (const contentAPIAction of contentAPIActions) {
      const contentAPIActionUID = `${subject}.${contentAPIAction}`;
      contentAPIPermissions.push({ action: contentAPIActionUID });
    }
  }

  return contentAPIPermissions;
};
