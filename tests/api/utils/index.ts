// Note: any tests that would cause writes to the db should be wrapped with this method to prevent changes
// Alternatively, we could truncate/insert the tables in afterEach which should be only marginally slower
// TODO: move to utils
export const testInTransaction = (test) => {
  return async () => {
    await strapi.db.transaction(async ({ rollback }) => {
      await test();
      await rollback();
    });
  };
};
