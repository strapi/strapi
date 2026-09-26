import { rollbackSchemaMutation } from '../schema-mutation';

describe('schema mutation rollback', () => {
  it('continues generated cleanup and every API restore after earlier compensation failures', async () => {
    const calls: string[] = [];

    await expect(
      rollbackSchemaMutation({
        builder: {
          async rollback() {
            calls.push('schema');
            throw new Error('schema rollback failed');
          },
        },
        apiHandler: {
          async rollback(uid) {
            calls.push(`api:${uid}`);
            if (uid === 'api::first.first') throw new Error('first API rollback failed');
          },
          async clearGenerated(apiName) {
            calls.push(`generated:${apiName}`);
          },
          finalize() {
            return Promise.resolve();
          },
        },
        backedUpApiUids: ['api::first.first', 'api::second.second'],
        generatedApiNames: ['created-before-schema-dir'],
      })
    ).rejects.toThrow('schema rollback failed');

    expect(calls).toEqual([
      'generated:created-before-schema-dir',
      'schema',
      'api:api::first.first',
      'api:api::second.second',
    ]);
  });
});
