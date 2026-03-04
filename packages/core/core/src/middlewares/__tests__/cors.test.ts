import { matchOrigin } from '../cors';

describe('CORS middleware', () => {
  describe('matchOrigin function', () => {
    describe('Exact string origin matching', () => {
      it('should allow exact origin match', async () => {
        const result = await matchOrigin('https://example.com:3000', 'https://example.com:3000');
        expect(result).toBe('https://example.com:3000');
      });

      it('should block origin with different port', async () => {
        const result = await matchOrigin('https://example.com:3001', 'https://example.com:3000');
        expect(result).toBe('');
      });

      it('should block origin with different protocol', async () => {
        const result = await matchOrigin('http://example.com:3000', 'https://example.com:3000');
        expect(result).toBe('');
      });

      it('should block origin with different subdomain', async () => {
        const result = await matchOrigin(
          'https://api.example.com:3000',
          'https://example.com:3000'
        );
        expect(result).toBe('');
      });

      it('should block origin with different domain', async () => {
        const result = await matchOrigin(
          'https://otherdomain.com:3000',
          'https://example.com:3000'
        );
        expect(result).toBe('');
      });

      it('should block origin with different port even if domain matches', async () => {
        const result = await matchOrigin('https://example.com:3001', 'https://example.com:3000');
        expect(result).toBe('');
      });
    });

    describe('Array of origins', () => {
      it('should allow origin that exists in array', async () => {
        const result = await matchOrigin('https://example.com:3000', [
          'https://example.com:3000',
          'https://api.example.com:3000',
        ]);
        expect(result).toBe('https://example.com:3000');
      });

      it('should block origin that does not exist in array', async () => {
        const result = await matchOrigin('https://otherdomain.com:3000', [
          'https://example.com:3000',
          'https://api.example.com:3000',
        ]);
        expect(result).toBe('');
      });

      it('should block origin with different port even if domain matches', async () => {
        const result = await matchOrigin('https://example.com:3001', [
          'https://example.com:3000',
          'https://api.example.com:3000',
        ]);
        expect(result).toBe('');
      });
    });

    describe('Comma-separated string of origins', () => {
      it('should allow origin that exists in comma-separated string', async () => {
        const result = await matchOrigin(
          'https://example.com:3000',
          'https://example.com:3000, https://api.example.com:3000'
        );
        expect(result).toBe('https://example.com:3000');
      });

      it('should block origin that does not exist in comma-separated string', async () => {
        const result = await matchOrigin(
          'https://otherdomain.com:3000',
          'https://example.com:3000, https://api.example.com:3000'
        );
        expect(result).toBe('');
      });

      it('should handle whitespace in comma-separated string', async () => {
        const result = await matchOrigin(
          'https://api.example.com:3000',
          'https://example.com:3000,https://api.example.com:3000'
        );
        expect(result).toBe('https://api.example.com:3000');
      });

      it('should handle single origin in comma-separated string', async () => {
        const result = await matchOrigin('https://example.com:3000', 'https://example.com:3000');
        expect(result).toBe('https://example.com:3000');
      });
    });

    describe('Function-based origin', () => {
      it('should allow origin based on function return', async () => {
        const originFunction = (ctx: any) => {
          const origin = ctx.get('Origin');
          return origin === 'https://example.com:3000' ? origin : '';
        };

        const mockCtx = {
          get(header: string) {
            if (header === 'Origin') return 'https://example.com:3000';
            return undefined;
          },
        };

        const result = await matchOrigin('https://example.com:3000', originFunction, mockCtx);
        expect(result).toBe('https://example.com:3000');
      });

      it('should block origin based on function return', async () => {
        const originFunction = (ctx: any) => {
          const origin = ctx.get('Origin');
          return origin === 'https://example.com:3000' ? origin : '';
        };

        const mockCtx = {
          get(header: string) {
            if (header === 'Origin') return 'https://otherdomain.com:3000';
            return undefined;
          },
        };

        const result = await matchOrigin('https://otherdomain.com:3000', originFunction, mockCtx);
        expect(result).toBe('');
      });

      it('should handle async function-based origin', async () => {
        const originFunction = async (ctx: any) => {
          const origin = ctx.get('Origin');
          return origin === 'https://example.com:3000' ? origin : '';
        };

        const mockCtx = {
          get(header: string) {
            if (header === 'Origin') return 'https://example.com:3000';
            return undefined;
          },
        };

        const result = await matchOrigin('https://example.com:3000', originFunction, mockCtx);
        expect(result).toBe('https://example.com:3000');
      });
    });

    describe('Default behavior', () => {
      it('should return * when no Origin header is present', async () => {
        const result = await matchOrigin(undefined, 'https://example.com:3000');
        expect(result).toBe('*');
      });

      it('should return * when requestOrigin is empty string', async () => {
        const result = await matchOrigin('', 'https://example.com:3000');
        expect(result).toBe('*');
      });

      it('should block "null" origin when not explicitly allowed', async () => {
        const result = await matchOrigin('null', 'https://example.com:3000');
        expect(result).toBe('');
      });

      it('should allow "null" origin when wildcard is configured', async () => {
        const result = await matchOrigin('null', '*');
        expect(result).toBe('null');
      });

      it('should allow any origin with default configuration (wildcard)', async () => {
        const result = await matchOrigin('https://example.com:3000', '*');
        expect(result).toBe('https://example.com:3000');
      });

      it('should allow all origins when configuredOrigin is undefined', async () => {
        const result = await matchOrigin('https://example.com:3000', undefined as any);
        expect(result).toBe('https://example.com:3000');
      });

      it('should allow all origins when configuredOrigin is null', async () => {
        const result = await matchOrigin('https://example.com:3000', null as any);
        expect(result).toBe('https://example.com:3000');
      });

      it('should block all origins when configuredOrigin is empty string', async () => {
        const result = await matchOrigin('https://example.com:3000', '');
        expect(result).toBe('');
      });
    });

    describe('Edge cases', () => {
      it('should handle wildcard origin configuration', async () => {
        const result = await matchOrigin('https://example.com:3000', '*');
        expect(result).toBe('https://example.com:3000');
      });

      it('should handle empty array of origins', async () => {
        const result = await matchOrigin('https://example.com:3000', []);
        expect(result).toBe('');
      });

      it('should handle empty string origin configuration', async () => {
        const result = await matchOrigin('https://example.com:3000', '');
        expect(result).toBe('');
      });

      it('should handle function that returns empty string', async () => {
        const originFunction = () => '';
        const result = await matchOrigin('https://example.com:3000', originFunction);
        expect(result).toBe('');
      });

      it('should handle function that returns array', async () => {
        const originFunction = () => ['https://example.com:3000', 'https://api.example.com:3000'];
        const result = await matchOrigin('https://example.com:3000', originFunction);
        expect(result).toBe('https://example.com:3000');
      });

      it('should handle wildcard in array of origins', async () => {
        const result = await matchOrigin('https://example.com:3000', [
          'https://api.example.com:3000',
          '*',
        ]);
        expect(result).toBe('https://example.com:3000');
      });

      it('should handle wildcard in comma-separated string of origins', async () => {
        const result = await matchOrigin(
          'https://example.com:3000',
          'https://api.example.com:3000, *'
        );
        expect(result).toBe('https://example.com:3000');
      });

      it('should handle wildcard in comma-separated string without spaces', async () => {
        const result = await matchOrigin(
          'https://example.com:3000',
          'https://api.example.com:3000,*'
        );
        expect(result).toBe('https://example.com:3000');
      });
    });
  });
});
