import { detectFieldRenames, applyRenameDetections } from '../field-rename-detector';
import type { Schema } from '@strapi/types';

describe('Field Rename Detector', () => {
  describe('detectFieldRenames', () => {
    it('should detect a simple text field rename', () => {
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        title: {
          type: 'string',
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        heading: {
          type: 'string',
        },
      };

      const renames = detectFieldRenames(oldAttributes, newAttributes, ['title'], ['heading']);

      expect(renames).toHaveLength(1);
      expect(renames[0].oldName).toBe('title');
      expect(renames[0].newName).toBe('heading');
      expect(renames[0].score).toBeGreaterThanOrEqual(60);
    });

    it('should detect rename with matching required property', () => {
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        email: {
          type: 'email',
          required: true,
          unique: true,
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        emailAddress: {
          type: 'email',
          required: true,
          unique: true,
        },
      };

      const renames = detectFieldRenames(oldAttributes, newAttributes, ['email'], ['emailAddress']);

      expect(renames).toHaveLength(1);
      expect(renames[0].oldName).toBe('email');
      expect(renames[0].newName).toBe('emailAddress');
      // Higher score because properties match
      expect(renames[0].score).toBeGreaterThanOrEqual(70);
    });

    it('should not detect rename when types differ', () => {
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        count: {
          type: 'integer',
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        countText: {
          type: 'string',
        },
      };

      const renames = detectFieldRenames(oldAttributes, newAttributes, ['count'], ['countText']);

      expect(renames).toHaveLength(0);
    });

    it('should detect relation rename with same target', () => {
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        author: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::users-permissions.user',
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        creator: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::users-permissions.user',
        },
      };

      const renames = detectFieldRenames(oldAttributes, newAttributes, ['author'], ['creator']);

      expect(renames).toHaveLength(1);
      expect(renames[0].oldName).toBe('author');
      expect(renames[0].newName).toBe('creator');
    });

    it('should not detect relation rename with different target', () => {
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        author: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'plugin::users-permissions.user',
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        article: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::article.article',
        },
      };

      const renames = detectFieldRenames(oldAttributes, newAttributes, ['author'], ['article']);

      expect(renames).toHaveLength(0);
    });

    it('should detect component rename with same component', () => {
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        seo: {
          type: 'component',
          component: 'shared.seo',
          repeatable: false,
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        metaData: {
          type: 'component',
          component: 'shared.seo',
          repeatable: false,
        },
      };

      const renames = detectFieldRenames(oldAttributes, newAttributes, ['seo'], ['metaData']);

      expect(renames).toHaveLength(1);
      expect(renames[0].oldName).toBe('seo');
      expect(renames[0].newName).toBe('metaData');
    });

    it('should handle multiple potential renames and pick best matches', () => {
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        title: {
          type: 'string',
          required: true,
        },
        description: {
          type: 'text',
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        heading: {
          type: 'string',
          required: true,
        },
        summary: {
          type: 'text',
        },
      };

      const renames = detectFieldRenames(
        oldAttributes,
        newAttributes,
        ['title', 'description'],
        ['heading', 'summary']
      );

      expect(renames).toHaveLength(2);
      
      // Should match title -> heading and description -> summary
      const titleRename = renames.find((r) => r.oldName === 'title');
      const descRename = renames.find((r) => r.oldName === 'description');

      expect(titleRename?.newName).toBe('heading');
      expect(descRename?.newName).toBe('summary');
    });

    it('should not create conflicting renames', () => {
      // If two old fields could map to the same new field, pick the best match
      const oldAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        field1: {
          type: 'string',
        },
        field2: {
          type: 'string',
          required: true,
        },
      };

      const newAttributes: Record<string, Schema.Attribute.AnyAttribute> = {
        newField: {
          type: 'string',
          required: true,
        },
      };

      const renames = detectFieldRenames(
        oldAttributes,
        newAttributes,
        ['field1', 'field2'],
        ['newField']
      );

      // Should only have one rename (field2 -> newField, as it has higher score)
      expect(renames).toHaveLength(1);
      expect(renames[0].oldName).toBe('field2');
      expect(renames[0].newName).toBe('newField');
    });
  });

  describe('applyRenameDetections', () => {
    it('should separate renames from actual additions and deletions', () => {
      const detectedRenames = [
        {
          oldName: 'title',
          newName: 'heading',
          score: 80,
          oldAttribute: { type: 'string' } as Schema.Attribute.AnyAttribute,
          newAttribute: { type: 'string' } as Schema.Attribute.AnyAttribute,
        },
      ];

      const result = applyRenameDetections(
        detectedRenames,
        ['title', 'oldField'],
        ['heading', 'newField']
      );

      expect(result.renames).toHaveLength(1);
      expect(result.renames[0].oldName).toBe('title');
      expect(result.actualDeletions).toEqual(['oldField']);
      expect(result.actualAdditions).toEqual(['newField']);
    });

    it('should handle case with no renames', () => {
      const result = applyRenameDetections([], ['deletedField'], ['addedField']);

      expect(result.renames).toHaveLength(0);
      expect(result.actualDeletions).toEqual(['deletedField']);
      expect(result.actualAdditions).toEqual(['addedField']);
    });

    it('should handle case with all fields renamed', () => {
      const detectedRenames = [
        {
          oldName: 'field1',
          newName: 'newField1',
          score: 80,
          oldAttribute: { type: 'string' } as Schema.Attribute.AnyAttribute,
          newAttribute: { type: 'string' } as Schema.Attribute.AnyAttribute,
        },
        {
          oldName: 'field2',
          newName: 'newField2',
          score: 75,
          oldAttribute: { type: 'integer' } as Schema.Attribute.AnyAttribute,
          newAttribute: { type: 'integer' } as Schema.Attribute.AnyAttribute,
        },
      ];

      const result = applyRenameDetections(
        detectedRenames,
        ['field1', 'field2'],
        ['newField1', 'newField2']
      );

      expect(result.renames).toHaveLength(2);
      expect(result.actualDeletions).toHaveLength(0);
      expect(result.actualAdditions).toHaveLength(0);
    });
  });
});
