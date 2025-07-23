// Generate actual permission changes based on parsed command

interface PermissionChange {
  type: 'add' | 'remove' | 'modify' | 'bulk';
  contentType?: string;
  plugin?: string;
  action: string;
  actions?: { action: string; type: 'add' | 'remove' | 'modify' }[]; // For bulk changes
  fields?: string[];
  conditions?: string[];
  displayName: string;
  permissionId?: string;
}

const ACTION_MAP: Record<string, string[]> = {
  create: ['plugin::content-manager.explorer.create'],
  read: ['plugin::content-manager.explorer.read'], // Strapi uses 'read' for the checkbox
  find: ['plugin::content-manager.explorer.find'],
  findOne: ['plugin::content-manager.explorer.findOne'],
  update: ['plugin::content-manager.explorer.update'],
  delete: ['plugin::content-manager.explorer.delete'],
  publish: ['plugin::content-manager.explorer.publish'],
};

export const generatePermissionChanges = (
  currentPermissions: any[],
  interpretation: any,
  layout: any
): PermissionChange[] => {
  const changes: PermissionChange[] = [];
  const { action, targets, permissions, conditions, fields } = interpretation;

  console.log('=== Generating Permission Changes ===');
  console.log('Interpretation:', interpretation);
  console.log('Action:', action);
  console.log('Targets:', targets);
  console.log('Permissions:', permissions);
  console.log('Current permissions count:', currentPermissions?.length || 0);

  // If we receive "all-content-types", we need to expand it client-side
  // This happens when the server doesn't have content types to expand
  let expandedTargets = targets;
  if (targets.includes('all-content-types')) {
    console.log('Received all-content-types, expanding client-side');
    console.log('Layout structure:', layout);
    console.log('Layout sections:', layout?.sections);
    expandedTargets = [];
    
    // Extract from layout sections
    if (layout?.sections) {
      if (layout.sections.collectionTypes?.subjects) {
        console.log('Found collectionTypes.subjects:', layout.sections.collectionTypes.subjects);
        layout.sections.collectionTypes.subjects.forEach((subject: any) => {
          if (subject.uid) {
            // Include ALL collection types, including plugins
            console.log(`Client: Adding collection type: ${subject.uid} (${subject.label})`);
            expandedTargets.push(subject.uid);
          }
        });
      } else {
        console.warn('No collectionTypes.subjects found in layout');
      }
      
      // Skip single types for "all content types" - user wants collection types only
      console.log('Skipping single types for all-content-types expansion');
    } else {
      console.warn('No layout.sections found');
    }
    
    console.log('Client-side expanded to:', expandedTargets);
    console.log('Client-side expanded count:', expandedTargets.length);
  }
  
  console.log('Processing targets:', expandedTargets);
  console.log('Targets count:', expandedTargets.length);
  console.log('Checking for read-only pattern:', { action, permissions, permissionsLength: permissions.length });

  // Always group changes by content type for better UX
  const shouldGroupByContentType = true;
  
  console.log('Grouping all changes by content type');
  
  if (shouldGroupByContentType) {
    
    // For each target, create a single bulk change that represents all permission changes
    expandedTargets.forEach(target => {
      console.log(`Processing target: ${target}`);
      
      // Collect all action changes for this content type
      const actionChanges: { action: string; type: 'add' | 'remove' | 'modify' }[] = [];
      
      // Process requested permissions
      permissions.forEach((permission: string) => {
        const actionIds = ACTION_MAP[permission] || [permission];
        
        actionIds.forEach(actionId => {
          // Check if permission exists
          const existingPermission = currentPermissions.find(perm => {
            const isContentType = target.includes('::') && target.includes('.');
            if (isContentType) {
              return perm.action === actionId && perm.subject === target;
            } else {
              return perm.action === target;
            }
          });
          
          // Determine change type based on action
          let changeType: 'add' | 'remove' | 'modify' | null = null;
          
          if (action === 'grant') {
            // For grant, we want to ensure the permission is enabled
            // If it already exists and is enabled, we can skip it, otherwise add/modify
            changeType = existingPermission ? 'modify' : 'add';
          } else if (action === 'revoke') {
            // For revoke, always include as remove to ensure all requested permissions are disabled
            changeType = 'remove';
          } else if (action === 'modify') {
            // For modify with read-only pattern
            if (permissions.length === 1 && permissions[0] === 'read') {
              // We need to process ALL permissions for read-only
              // This will be handled separately below
            } else {
              changeType = existingPermission ? 'modify' : 'add';
            }
          }
          
          console.log(`    ${actionId}: exists=${!!existingPermission}, changeType=${changeType}`);
          
          if (changeType) {
            actionChanges.push({
              action: actionId,
              type: changeType
            });
          }
        });
      });
      
      // Special handling for read-only pattern - we need to process ALL actions
      if (action === 'modify' && permissions.length === 1 && permissions[0] === 'read') {
        actionChanges.length = 0; // Clear and rebuild for read-only
        
        const allActions = ['create', 'read', 'update', 'delete', 'publish'];
        allActions.forEach(permission => {
          const actionIds = ACTION_MAP[permission] || [permission];
          
          actionIds.forEach(actionId => {
            const existingPermission = currentPermissions.find(perm => {
              const isContentType = target.includes('::') && target.includes('.');
              if (isContentType) {
                return perm.action === actionId && perm.subject === target;
              } else {
                return perm.action === target;
              }
            });
            
            const isReadPermission = actionId.includes('.read') || actionId.includes('.find');
            let changeType: 'add' | 'remove' | 'modify' = isReadPermission ? 
              (existingPermission ? 'modify' : 'add') : 'remove';
            
            actionChanges.push({
              action: actionId,
              type: changeType
            });
          });
        });
      }
      
      // Create a single bulk change for this content type
      console.log(`  Action changes collected for ${target}:`, actionChanges);
      
      if (actionChanges.length > 0) {
        const displayName = getDisplayName(target, 'bulk', layout);
        
        // Determine the bulk action type and description
        let bulkActionType = 'modify';
        let bulkDescription = displayName;
        
        // Analyze what's actually changing
        const addCount = actionChanges.filter(a => a.type === 'add').length;
        const removeCount = actionChanges.filter(a => a.type === 'remove').length;
        const modifyCount = actionChanges.filter(a => a.type === 'modify').length;
        
        console.log(`  Changes breakdown: add=${addCount}, remove=${removeCount}, modify=${modifyCount}`);
        
        if (action === 'modify' && permissions.length === 1 && permissions[0] === 'read') {
          bulkActionType = 'read-only';
          bulkDescription = `Set ${displayName} to read-only`;
        } else if (action === 'grant' && permissions.length >= 4) {
          bulkActionType = 'full-access';
          bulkDescription = `Grant full access to ${displayName}`;
        } else if (action === 'grant') {
          const permissionNames = permissions.map(p => {
            const map: Record<string, string> = {
              create: 'Create',
              read: 'View',
              update: 'Edit',
              delete: 'Delete',
              publish: 'Publish'
            };
            return map[p] || p;
          }).join(', ');
          bulkDescription = `Grant ${permissionNames} to ${displayName}`;
          bulkActionType = 'grant';
        } else if (action === 'revoke') {
          const permissionNames = permissions.map(p => {
            const map: Record<string, string> = {
              create: 'Create',
              read: 'View',
              update: 'Edit',
              delete: 'Delete',
              publish: 'Publish'
            };
            return map[p] || p;
          }).join(', ');
          bulkDescription = `Remove ${permissionNames} from ${displayName}`;
          bulkActionType = 'revoke';
        } else if (modifyCount > 0) {
          bulkDescription = `Modify permissions for ${displayName}`;
          bulkActionType = 'modify';
        } else {
          // No actual changes
          bulkDescription = `No changes for ${displayName}`;
          bulkActionType = 'no-change';
        }
        
        const bulkChange: PermissionChange = {
          type: 'bulk',
          contentType: target.includes('::') && target.includes('.') ? target : undefined,
          plugin: target.startsWith('plugin::') && !target.includes('.') ? target : undefined,
          action: bulkActionType,
          actions: actionChanges,
          displayName: bulkDescription,
          fields,
          conditions,
        };
        
        console.log(`  ✓ Generated bulk change for ${target}:`, bulkChange);
        changes.push(bulkChange);
      } else {
        console.log(`  ✗ No action changes for ${target}, skipping bulk change`);
      }
    });
  }

  console.log('Total changes generated:', changes.length);
  return changes;
};

// expandTargets function removed - expansion now happens in the AI service

const generateSingleChange = (
  action: 'grant' | 'revoke' | 'modify',
  target: string,
  actionId: string,
  currentPermissions: any[],
  layout: any,
  fields?: string[],
  conditions?: string[],
  allPermissions?: string[]
): PermissionChange | null => {
  // All targets that have a UID structure (api::, plugin::users-permissions.user, etc.) 
  // are content types that need the content-manager explorer actions
  const isContentType = target.includes('::') && target.includes('.');
  const isPlugin = target.startsWith('plugin::') && !target.includes('.');

  // Find existing permission
  const existingPermission = currentPermissions.find(perm => {
    if (isContentType) {
      return perm.action === actionId && perm.subject === target;
    } else {
      return perm.action === target;
    }
  });

  // Determine change type
  let changeType: 'add' | 'remove' | 'modify';
  if (action === 'grant') {
    // For grant, we only add if permission doesn't exist
    if (!existingPermission) {
      changeType = 'add';
    } else {
      // Permission already exists, no change needed
      return null;
    }
  } else if (action === 'revoke') {
    // For revoke, we always show it as remove (even if it doesn't exist)
    // This helps users see what will be removed
    changeType = 'remove';
  } else if (action === 'modify') {
    // For modify, we show different change types based on the permission
    // If we're modifying to read-only, we need to handle it specially
    if (allPermissions && allPermissions.length === 1 && allPermissions[0] === 'read') {
      // Read-only mode: add read permissions, remove write permissions
      const isReadPermission = actionId.includes('.read') || actionId.includes('.find');
      if (isReadPermission) {
        changeType = existingPermission ? 'modify' : 'add';
      } else {
        // For non-read permissions in read-only mode, always remove them
        changeType = 'remove';
      }
    } else if (existingPermission) {
      changeType = 'modify';
    } else {
      // Can't modify something that doesn't exist normally
      return null;
    }
  } else {
    return null;
  }

  // Get display name
  const displayName = getDisplayName(target, actionId, layout);

  // Build the change object
  const change: PermissionChange = {
    type: changeType,
    action: actionId,
    displayName,
  };

  if (isContentType) {
    change.contentType = target;
  } else if (isPlugin) {
    change.plugin = target;
  }

  if (fields && fields.length > 0) {
    change.fields = fields;
  }

  if (conditions && conditions.length > 0) {
    change.conditions = conditions;
  }

  if (existingPermission) {
    change.permissionId = existingPermission.id;
  }

  return change;
};

const getDisplayName = (target: string, action: string, layout: any): string => {
  let targetName = target;
  let actionName = action.split('.').pop() || action;

  // Special handling for bulk action
  if (action === 'bulk') {
    // Just return the content type name for bulk actions
    const isContentType = target.includes('::') && target.includes('.');
    
    if (isContentType) {
      // Look in sections structure
      let contentType;
      if (layout?.sections) {
        contentType = layout.sections.collectionTypes?.subjects?.find((ct: any) => ct.uid === target) ||
                      layout.sections.singleTypes?.subjects?.find((st: any) => st.uid === target);
      }
      
      if (contentType?.label) {
        return contentType.label;
      } else if (contentType?.info?.displayName) {
        return contentType.info.displayName;
      } else {
        // Extract name from UID as fallback
        targetName = target.split('.').pop() || target;
        // Capitalize first letter
        return targetName.charAt(0).toUpperCase() + targetName.slice(1);
      }
    }
    return target;
  }

  // Check if this is a content type (has :: and .)
  const isContentType = target.includes('::') && target.includes('.');
  
  if (isContentType) {
    // Look in sections structure - subjects is an array in the collectionTypes/singleTypes objects
    let contentType;
    if (layout?.sections) {
      contentType = layout.sections.collectionTypes?.subjects?.find((ct: any) => ct.uid === target) ||
                    layout.sections.singleTypes?.subjects?.find((st: any) => st.uid === target);
    }
    
    if (contentType?.label) {
      targetName = contentType.label;
    } else if (contentType?.info?.displayName) {
      targetName = contentType.info.displayName;
    } else {
      // Extract name from UID as fallback
      targetName = target.split('.').pop() || target;
      // Capitalize first letter
      targetName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
    }
  } else if (target.startsWith('plugin::')) {
    // This is a plugin (not a content type)
    const pluginId = target.replace('plugin::', '');
    targetName = pluginId.split('-').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Humanize action name
  const actionMap: Record<string, string> = {
    create: 'Create',
    find: 'View',
    findOne: 'View details',
    update: 'Edit',
    delete: 'Delete',
    publish: 'Publish/Unpublish',
  };

  actionName = actionMap[actionName] || actionName;

  return `${actionName} ${targetName}`;
};

// Helper to convert AI changes to checkbox events
export const convertChangesToCheckboxEvents = (
  changes: PermissionChange[],
  currentPermissions: any,
  layout: any
): Array<{type: string; target: {name: string; value: any}}> => {
  const events: Array<{type: string; target: {name: string; value: any}}> = [];

  changes.forEach(change => {
    // Handle bulk changes
    if (change.type === 'bulk' && change.actions) {
      change.actions.forEach(actionItem => {
        const pathToPermission = `..${change.contentType}..${actionItem.action}`;
        
        events.push({
          type: 'simple',
          target: {
            name: `${pathToPermission}..enabled`,
            value: actionItem.type !== 'remove',
          }
        });
      });
      return; // Skip the rest for bulk changes
    }
    
    if (change.contentType) {
      // For content type permissions
      const pathToPermission = `..${change.contentType}..${change.action}`;
      
      events.push({
        type: 'simple',
        target: {
          name: `${pathToPermission}..enabled`,
          value: change.type !== 'remove',
        }
      });

      // Handle fields if specified
      if (change.fields && change.fields.length > 0) {
        events.push({
          type: 'simple',
          target: {
            name: `${pathToPermission}..properties..fields`,
            value: change.fields,
          }
        });
      }

      // Handle conditions
      if (change.conditions && change.conditions.length > 0) {
        change.conditions.forEach(condition => {
          events.push({
            type: 'simple',
            target: {
              name: `${pathToPermission}..conditions..${condition}`,
              value: true,
            }
          });
        });
      }
    } else if (change.plugin) {
      // For plugin permissions
      const pluginName = change.plugin.replace('plugin::', '');
      const pathToPermission = `..${pluginName}..${change.action}`;
      
      events.push({
        type: 'simple',
        target: {
          name: `${pathToPermission}..enabled`,
          value: change.type !== 'remove',
        }
      });
    }
  });

  return events;
};