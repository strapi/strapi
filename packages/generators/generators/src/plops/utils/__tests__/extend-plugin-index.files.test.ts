import outdent from 'outdent';

import { appendToFile } from '../extend-plugin-index-files';

describe('Extend-Plugin-Index-Files util', () => {
  describe('Empty file handling', () => {
    it('should handle completely empty file with ESM content-type', () => {
      const result = appendToFile('', {
        singularName: 'user',
        type: 'content-type',
      });

      expect(result).toContain("import userSchema from './user/schema.json';");
      expect(result).toContain('export default {');
      expect(result).toContain('user: {');
      expect(result).toContain('schema: userSchema');
    });

    it('should handle completely empty file with ESM index', () => {
      const result = appendToFile('', {
        singularName: 'product',
        type: 'index',
      });

      expect(result).toContain("import product from './product';");
      expect(result).toContain('export default {');
      expect(result).toContain('product: product');
    });

    it('should handle whitespace-only file', () => {
      const result = appendToFile('   \n\n  ', {
        singularName: 'category',
        type: 'routes',
      });

      expect(result).toContain("import category from './category';");
      expect(result).toContain('export default () => ({');
      expect(result).toContain("type: 'content-api',");
      expect(result).toContain('routes: [...category.routes]');
    });
  });

  describe('ESM file handling', () => {
    it('should add content-type to empty ESM export', () => {
      const template = 'export default {};';
      const result = appendToFile(template, {
        singularName: 'article',
        type: 'content-type',
      });

      expect(result).toContain("import articleSchema from './article/schema.json';");
      expect(result).toContain('article: {');
      expect(result).toContain('schema: articleSchema');
    });

    it('should add index to existing ESM export with other properties', () => {
      const template = outdent`
        import existing from './existing';

        export default {
          existing: existing
        };
      `;
      const result = appendToFile(template, {
        singularName: 'newItem',
        type: 'index',
      });

      expect(result).toContain("import newItem from './newItem';");
      expect(result).toContain('existing: existing');
      expect(result).toContain('newItem: newItem');
    });

    it('should add routes to empty ESM export', () => {
      const template = 'export default {};';
      const result = appendToFile(template, {
        singularName: 'order',
        type: 'routes',
      });

      expect(result).toContain("import order from './order';");
      expect(result).toContain('export default () => ({');
      expect(result).toContain("type: 'content-api'");
      expect(result).toContain('...order.routes');
    });

    it('should add routes to existing ESM routes array', () => {
      const template = outdent`
        import existing from './existing';

        export default () => ({
          type: 'content-api',
          routes: [
            ...existing.routes
          ]
        });
      `;
      const result = appendToFile(template, {
        singularName: 'newRoute',
        type: 'routes',
      });

      expect(result).toContain("import newRoute from './newRoute';");
      expect(result).toContain('...existing.routes');
      expect(result).toContain('...newRoute.routes');
    });

    it('should not duplicate existing ESM imports and exports', () => {
      const template = outdent`
        import user from './user';

        export default {
          user: user
        };
      `;
      const result = appendToFile(template, {
        singularName: 'user',
        type: 'index',
      });

      // Should not duplicate
      const importMatches = result.match(/import user from/g);
      expect(importMatches).toHaveLength(1);

      const userPropertyMatches = result.match(/user: user/g);
      expect(userPropertyMatches).toHaveLength(1);
    });
  });

  describe('CJS file handling', () => {
    it('should add content-type to empty CJS export', () => {
      const template = 'module.exports = {};';
      const result = appendToFile(template, {
        singularName: 'post',
        type: 'content-type',
      });

      expect(result).toContain("const postSchema = require('./post/schema.json');");
      expect(result).toContain('post: {');
      expect(result).toContain('schema: postSchema');
    });

    it('should add index to existing CJS export with other properties', () => {
      const template = outdent`
        const existing = require('./existing');

        module.exports = {
          existing: existing
        };
      `;
      const result = appendToFile(template, {
        singularName: 'comment',
        type: 'index',
      });

      expect(result).toContain("const comment = require('./comment');");
      expect(result).toContain('existing: existing');
      expect(result).toContain('comment: comment');
    });

    it('should add routes to empty CJS export', () => {
      const template = 'module.exports = {};';
      const result = appendToFile(template, {
        singularName: 'review',
        type: 'routes',
      });

      expect(result).toContain("const review = require('./review');");
      expect(result).toContain('module.exports = () => ({');
      expect(result).toContain("type: 'content-api'");
      expect(result).toContain('...review.routes');
    });

    it('should detect CJS format from require statements', () => {
      const template = outdent`
        const existingModule = require('./existing');

        module.exports = {
          existing: existingModule
        };
      `;
      const result = appendToFile(template, {
        singularName: 'tag',
        type: 'index',
      });

      expect(result).toContain("const tag = require('./tag');");
      expect(result).toContain('tag: tag');
    });

    it('should not duplicate existing CJS requires and exports', () => {
      const template = outdent`
        const product = require('./product');

        module.exports = {
          product: product
        };
      `;
      const result = appendToFile(template, {
        singularName: 'product',
        type: 'index',
      });

      // Should not duplicate
      const requireMatches = result.match(/const product = require/g);
      expect(requireMatches).toHaveLength(1);

      const productPropertyMatches = result.match(/product: product/g);
      expect(productPropertyMatches).toHaveLength(1);
    });
  });

  describe('Routes-specific behavior', () => {
    it('should handle routes array in ESM object export', () => {
      const template = outdent`
        import existing from './existing';

        export default {
          type: 'content-api',
          routes: [
            ...existing.routes
          ]
        };
      `;
      const result = appendToFile(template, {
        singularName: 'newRoute',
        type: 'routes',
      });

      expect(result).toContain('...existing.routes');
      expect(result).toContain('...newRoute.routes');
    });

    it('should convert object export to arrow function for routes', () => {
      const template = outdent`
        import existing from './existing';

        export default {
          existing: existing
        };
      `;
      const result = appendToFile(template, {
        singularName: 'route',
        type: 'routes',
      });

      expect(result).toContain('export default () => ({');
      expect(result).toContain("type: 'content-api'");
      expect(result).toContain('...route.routes');
    });
  });

  describe('File with existing imports', () => {
    it('should place new import after existing imports in ESM', () => {
      const template = outdent`
        import first from './first';
        import second from './second';

        export default {
          first: first,
          second: second
        };
      `;
      const result = appendToFile(template, {
        singularName: 'third',
        type: 'index',
      });

      const lines = result.split('\n');
      const thirdImportLine = lines.findIndex((line) => line.includes('import third from'));
      const firstImportLine = lines.findIndex((line) => line.includes('import first from'));

      expect(thirdImportLine).toBeGreaterThan(firstImportLine);
      expect(result).toContain('third: third');
    });

    it('should place new require after existing requires in CJS', () => {
      const template = outdent`
        const first = require('./first');
        const second = require('./second');

        module.exports = {
          first: first,
          second: second
        };
      `;
      const result = appendToFile(template, {
        singularName: 'third',
        type: 'index',
      });

      const lines = result.split('\n');
      const thirdRequireLine = lines.findIndex((line) => line.includes('const third = require'));
      const firstRequireLine = lines.findIndex((line) => line.includes('const first = require'));

      expect(thirdRequireLine).toBeGreaterThan(firstRequireLine);
      expect(result).toContain('third: third');
    });
  });

  describe('Content-type specific behavior', () => {
    it('should use Schema suffix for content-type variable names', () => {
      const template = 'export default {};';
      const result = appendToFile(template, {
        singularName: 'blogPost',
        type: 'content-type',
      });

      expect(result).toContain("import blogPostSchema from './blogPost/schema.json';");
      expect(result).toContain('blogPost: {');
      expect(result).toContain('schema: blogPostSchema');
    });

    it('should create nested schema object for content-type', () => {
      const template = 'export default {};';
      const result = appendToFile(template, {
        singularName: 'event',
        type: 'content-type',
      });

      expect(result).toContain('event: {');
      expect(result).toContain('schema: eventSchema');
    });
  });

  describe('Function exports that return objects', () => {
    it('should handle ESM arrow function export that returns object', () => {
      const template = outdent`
        export default () => ({
          existing: 'value'
        });
      `;
      const result = appendToFile(template, {
        singularName: 'newItem',
        type: 'index',
      });

      expect(result).toContain("import newItem from './newItem';");
      expect(result).toContain("existing: 'value'");
      expect(result).toContain('newItem: newItem');
    });

    it('should handle ESM regular function export that returns object', () => {
      const template = outdent`
        export default function() {
          return {
            existing: 'value'
          };
        }
      `;
      const result = appendToFile(template, {
        singularName: 'newItem',
        type: 'index',
      });

      expect(result).toContain("import newItem from './newItem';");
      expect(result).toContain("existing: 'value'");
      expect(result).toContain('newItem: newItem');
    });

    it('should handle CJS function assignment that returns object', () => {
      const template = outdent`
        module.exports = function() {
          return {
            existing: 'value'
          };
        };
      `;
      const result = appendToFile(template, {
        singularName: 'newItem',
        type: 'index',
      });

      expect(result).toContain("const newItem = require('./newItem');");
      expect(result).toContain("existing: 'value'");
      expect(result).toContain('newItem: newItem');
    });

    it('should handle function export with routes', () => {
      const template = outdent`
        export default () => ({
          type: 'content-api',
          routes: []
        });
      `;
      const result = appendToFile(template, {
        singularName: 'newRoute',
        type: 'routes',
      });

      expect(result).toContain("import newRoute from './newRoute';");
      expect(result).toContain('...newRoute.routes');
    });
  });

  describe('Const variable exports', () => {
    it('should handle ESM const variable export', () => {
      const template = outdent`
        const controllers = {
          test: 'value'
        };

        export default controllers;
      `;
      const result = appendToFile(template, {
        singularName: 'newController',
        type: 'index',
      });

      expect(result).toContain("import newController from './newController';");
      expect(result).toContain("test: 'value'");
      expect(result).toContain('newController: newController');
    });

    it('should handle CJS const variable export', () => {
      const template = outdent`
        const services = {
          existing: 'service'
        };

        module.exports = services;
      `;
      const result = appendToFile(template, {
        singularName: 'newService',
        type: 'index',
      });

      expect(result).toContain("const newService = require('./newService');");
      expect(result).toContain("existing: 'service'");
      expect(result).toContain('newService: newService');
    });

    it('should handle const variable with content-type', () => {
      const template = outdent`
        const contentTypes = {
          existing: { schema: 'existingSchema' }
        };

        export default contentTypes;
      `;
      const result = appendToFile(template, {
        singularName: 'article',
        type: 'content-type',
      });

      expect(result).toContain("import articleSchema from './article/schema.json';");
      expect(result).toContain("existing: { schema: 'existingSchema' }");
      expect(result).toContain('article: {');
      expect(result).toContain('schema: articleSchema');
    });

    it('should handle const variable with routes', () => {
      const template = outdent`
        const routes = {
          type: 'content-api',
          routes: []
        };

        export default routes;
      `;
      const result = appendToFile(template, {
        singularName: 'newRoute',
        type: 'routes',
      });

      expect(result).toContain("import newRoute from './newRoute';");
      expect(result).toContain('...newRoute.routes');
    });

    it('should handle differently named const variable', () => {
      const template = outdent`
        const myCustomObject = {
          test: 'value'
        };

        export default myCustomObject;
      `;
      const result = appendToFile(template, {
        singularName: 'newItem',
        type: 'index',
      });

      expect(result).toContain("import newItem from './newItem';");
      expect(result).toContain("test: 'value'");
      expect(result).toContain('newItem: newItem');
    });
  });

  describe('Hyphenated names handling', () => {
    it('should handle hyphenated singular names correctly', () => {
      const result = appendToFile('', {
        singularName: 'my-first-controller',
        type: 'index',
      });

      expect(result).toContain("import myFirstController from './my-first-controller';");
      expect(result).toContain('export default {');
      expect(result).toContain("'my-first-controller': myFirstController");
    });

    it('should handle hyphenated names with content-type', () => {
      const result = appendToFile('', {
        singularName: 'my-content-type',
        type: 'content-type',
      });

      expect(result).toContain("import myContentTypeSchema from './my-content-type/schema.json';");
      expect(result).toContain("'my-content-type': {");
      expect(result).toContain('schema: myContentTypeSchema');
    });

    it('should handle hyphenated names with routes', () => {
      const result = appendToFile('', {
        singularName: 'my-route-handler',
        type: 'routes',
      });

      expect(result).toContain("import myRouteHandler from './my-route-handler';");
      expect(result).toContain('...myRouteHandler.routes');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid config', () => {
      expect(() => {
        appendToFile('export default {};', {
          singularName: '',
          type: 'index',
        });
      }).toThrow('Invalid config: singularName and type are required');
    });

    it('should throw error for missing type', () => {
      expect(() => {
        appendToFile('export default {};', {
          singularName: 'test',
        } as any);
      }).toThrow('Invalid config: singularName and type are required');
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        appendToFile('export default {};', {
          singularName: 'test',
          type: 'unknown-type' as any,
        });
      }).toThrow('Unknown append type: unknown-type');
    });
  });
});
