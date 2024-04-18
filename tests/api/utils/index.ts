// Note: any tests that would cause writes to the db should be wrapped with this method to prevent changes
// Alternatively, we could truncate/insert the tables in afterEach which should be only marginally slower
// TODO: move to utils
export const wrapInTransaction = (test) => {
  return async (...args) => {
    await strapi.db.transaction(async ({ trx, rollback }) => {
      await test(trx, ...args);
      await rollback();
    });
  };
};

export const testInTransaction = (...args: Parameters<jest.It>) => {
  if (args.length > 1) {
    return it(
      args[0], // name
      wrapInTransaction(args[1]), // fn
      args[2] // timeout
    );
  }
  return it(...args);
};

testInTransaction.skip = it.skip as jest.It['skip'];
testInTransaction.only = it.only as jest.It['only'];
testInTransaction.todo = it.todo as jest.It['todo'];
testInTransaction.each = it.each as jest.It['each'];
