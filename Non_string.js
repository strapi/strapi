let result = await strapi.db.connection.raw("SELECT '{\"key\": 1}'::jsonb AS jsonb_column");
