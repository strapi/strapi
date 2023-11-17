import releaseController from '../controllers/release';

describe('Release controller', () => {
  describe('create', () => {
    it('throws an error given bad request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {},
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseController.create(ctx)).rejects.toThrow('name is a required field');
    });
  });
  
  describe('update', () => {
    it('throws an error given bad request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {
            name: ''
          },
        },
        params: {
          id: 1
        },
      };
  
      // @ts-expect-error partial context
      expect(() => releaseController.update(ctx)).rejects.toThrow('name is a required field');
    });
    
    it('throws an error given unknown request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {
            name: 'Test',
            unknown: ''
          },
        },
        params: {
          id: 1
        },
      };
  
      // @ts-expect-error partial context
      expect(() => releaseController.update(ctx)).rejects.toThrow('this field has unspecified keys: unknown');
    });
  });
});
