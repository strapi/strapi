const pluginId = 'audit-logs';

export const getService = (name: string) => {
  return strapi.plugin(pluginId).service(name);
};

export const getConfig = () => {
  return strapi.config.get(`plugin::${pluginId}`) || {};
};

export const isAuditingEnabled = (): boolean => {
  const config = getConfig();
  return config.enabled !== false; // Default to true
};

export const isContentTypeExcluded = (contentTypeUid: string): boolean => {
  const config = getConfig();
  const excludeList = config.excludeContentTypes || [];
  
  // Always exclude audit logs themselves to prevent infinite loops
  if (contentTypeUid === `plugin::${pluginId}.audit-log`) {
    return true;
  }
  
  return excludeList.includes(contentTypeUid);
};

export const getUserInfo = (ctx: any) => {
  if (!ctx || !ctx.state || !ctx.state.user) {
    return {
      userId: null,
      userName: null,
      userEmail: null,
    };
  }

  const user = ctx.state.user;
  return {
    userId: user.id || null,
    userName: user.username || user.firstname || null,
    userEmail: user.email || null,
  };
};

export const sanitizeData = (data: any): any => {
  if (!data) return null;
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'resetPasswordToken', 'registrationToken'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

export const calculateDiff = (oldData: any, newData: any): string[] => {
  if (!oldData || !newData) return [];
  
  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  allKeys.forEach(key => {
  // Skip internal fields
  const internalFields = ['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy'];
  if (internalFields.indexOf(key) !== -1) {
    return;
  }
    
    const oldValue = oldData[key];
    const newValue = newData[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields.push(key);
    }
  });
  
  return changedFields;
};

