import { OperationIDAssembler } from '../src/assemblers/document/path/path-item/operation/operation-id';

describe('OperationIDAssembler', () => {
  test('appends path segments to the operation id', () => {
    const assembler = new OperationIDAssembler();
    const context = { output: { data: {} as { operationId?: string } } };

    assembler.assemble(
      context as any,
      {
        method: 'GET',
        path: '/articles/:id',
        info: { apiName: 'article' },
      } as any
    );

    expect(context.output.data.operationId).toBe('article/get/articles_by_id');
  });
});
