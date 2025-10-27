const bootstrap = ({ strapi }) => {
  // Helper function to get service
  const getService = (name: string) => {
    return strapi.plugin('audit-logs').service(name);
  };

  // Register lifecycle hooks for all content types
  strapi.db.lifecycles.subscribe({
    // Apply to all models except our audit log to prevent infinite loops
    models: Object.keys(strapi.contentTypes).filter(uid => uid !== 'plugin::audit-logs.audit-log'),

    async afterCreate(event) {
      const { model, result, params } = event;
      
      // Skip if this is our audit log content type
      if (model === 'plugin::audit-logs.audit-log') {
        return;
      }

      try {
        const auditService = getService('audit');
        const userInfo = auditService.extractUserInfo(params?.ctx || params);
        const requestInfo = auditService.extractRequestMetadata(params?.ctx || params);

        await auditService.createLog({
          contentType: model,
          contentId: result.id,
          action: 'create',
          ...userInfo,
          ...requestInfo,
          newData: result,
          previousData: null,
          changedFields: null,
          metadata: {
            source: 'strapi-api',
          },
        });
      } catch (error) {
        strapi.log.error('Error in audit logging (afterCreate):', error);
      }
    },

    async afterUpdate(event) {
      const { model, result, params } = event;
      
      // Skip if this is our audit log content type
      if (model === 'plugin::audit-logs.audit-log') {
        return;
      }

      try {
        const auditService = getService('audit');
        const userInfo = auditService.extractUserInfo(params?.ctx || params);
        const requestInfo = auditService.extractRequestMetadata(params?.ctx || params);

        // Try to get the previous data from the database
        let previousData = null;
        try {
          // The result contains the updated data, we need to fetch the original
          // Since this is afterUpdate, we can't get the exact previous state
          // but we can detect what changed by comparing with what we have
          const currentInDb = await strapi.db.query(model).findOne({
            where: { id: result.id },
          });
          previousData = currentInDb;
        } catch (fetchError) {
          strapi.log.debug('Could not fetch previous data for audit log:', fetchError);
        }

        // Calculate changed fields
        const changedFields = auditService.calculateChangedFields(previousData, result);

        await auditService.createLog({
          contentType: model,
          contentId: result.id,
          action: 'update',
          ...userInfo,
          ...requestInfo,
          newData: result,
          previousData,
          changedFields,
          metadata: {
            source: 'strapi-api',
          },
        });
      } catch (error) {
        strapi.log.error('Error in audit logging (afterUpdate):', error);
      }
    },

    async beforeDelete(event) {
      const { model, params } = event;
      
      // Skip if this is our audit log content type
      if (model === 'plugin::audit-logs.audit-log') {
        return;
      }

      try {
        // Store the data before deletion so we can log it
        const recordToDelete = await strapi.db.query(model).findOne({
          where: params.where,
        });

        if (recordToDelete) {
          // Store in the event for use in afterDelete
          event._auditLogData = recordToDelete;
        }
      } catch (error) {
        strapi.log.error('Error in audit logging (beforeDelete):', error);
      }
    },

    async afterDelete(event) {
      const { model, params } = event;
      
      // Skip if this is our audit log content type
      if (model === 'plugin::audit-logs.audit-log') {
        return;
      }

      try {
        const auditService = getService('audit');
        const userInfo = auditService.extractUserInfo(params?.ctx || params);
        const requestInfo = auditService.extractRequestMetadata(params?.ctx || params);

        // Get the deleted data from beforeDelete hook
        const deletedData = event._auditLogData;

        if (deletedData) {
          await auditService.createLog({
            contentType: model,
            contentId: deletedData.id,
            action: 'delete',
            ...userInfo,
            ...requestInfo,
            newData: null,
            previousData: deletedData,
            changedFields: null,
            metadata: {
              source: 'strapi-api',
            },
          });
        }
      } catch (error) {
        strapi.log.error('Error in audit logging (afterDelete):', error);
      }
    },
  });

  strapi.log.info('Audit logs plugin lifecycle hooks registered');
};

export default bootstrap;