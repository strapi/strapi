export abstract class CoreService {
  getFetchParams(params = {}): any {
    return {
      status: 'published',
      ...params,
    };
  }
}
