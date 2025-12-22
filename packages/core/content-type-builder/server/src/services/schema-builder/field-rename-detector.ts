/**
 * Field Rename Detection and Migration Utility
 * 
 * This utility helps detect when a field is being renamed (as opposed to being deleted and recreated)
 * and performs the appropriate database column rename to preserve data.
 * 
 * Heuristics for detecting renames:
 * 1. One field deleted + one field added with same type
 * 2. Field type and basic configuration match
 * 3. No other structural changes that would indicate a complete rebuild
 */

import _ from 'lodash';
import type { Schema } from '@strapi/types';

interface AttributeComparison {
  type: string;
  required?: boolean;
  unique?: boolean;
  repeatable?: boolean;
  target?: string; // for relations
  component?: string; // for components
}

/**
 * Compare two attributes to determine if they are similar enough to be considered a rename
 */
const areAttributesSimilar = (
  attr1: Schema.Attribute.AnyAttribute,
  attr2: Schema.Attribute.AnyAttribute
): boolean => {
  // Must have the same type
  if (attr1.type !== attr2.type) {
    return false;
  }

  // For relations, check if target is the same
  if (attr1.type === 'relation' && attr2.type === 'relation') {
    return attr1.target === attr2.target && attr1.relation === attr2.relation;
  }

  // For components, check if component is the same
  if (attr1.type === 'component' && attr2.type === 'component') {
    return attr1.component === attr2.component && attr1.repeatable === attr2.repeatable;
  }

  // For dynamiczones, they're similar if both are dynamiczones
  if (attr1.type === 'dynamiczone' && attr2.type === 'dynamiczone') {
    return true;
  }

  // For other types, same type is enough
  return true;
};

/**
 * Calculate a similarity score between two attributes (0-100)
 * Higher score means more likely to be a rename
 */
const calculateSimilarityScore = (
  attr1: Schema.Attribute.AnyAttribute,
  attr2: Schema.Attribute.AnyAttribute
): number => {
  let score = 0;

  // Type match is mandatory (checked by areAttributesSimilar)
  if (attr1.type !== attr2.type) {
    return 0;
  }

  score += 40; // Base score for same type

  // Check configurable properties
  if (attr1.required === attr2.required) score += 10;
  if (attr1.unique === attr2.unique) score += 10;
  if (attr1.private === attr2.private) score += 5;

  // Type-specific checks
  if (attr1.type === 'relation' && attr2.type === 'relation') {
    if (attr1.target === attr2.target) score += 20;
    if (attr1.relation === attr2.relation) score += 15;
  }

  if (attr1.type === 'component' && attr2.type === 'component') {
    if (attr1.component === attr2.component) score += 30;
    if (attr1.repeatable === attr2.repeatable) score += 5;
  }

  if ((attr1.type === 'string' || attr1.type === 'text') && 
      (attr2.type === 'string' || attr2.type === 'text')) {
    if (attr1.minLength === attr2.minLength) score += 5;
    if (attr1.maxLength === attr2.maxLength) score += 5;
  }

  return Math.min(score, 100);
};

interface RenameDetection {
  oldName: string;
  newName: string;
  score: number;
  oldAttribute: Schema.Attribute.AnyAttribute;
  newAttribute: Schema.Attribute.AnyAttribute;
}

/**
 * Detect potential field renames by comparing deleted and added fields
 * 
 * @param oldAttributes - Original attributes
 * @param newAttributes - New attributes
 * @param deletedKeys - Keys that were deleted
 * @param newKeys - Keys that were added
 * @returns Array of detected renames sorted by confidence score
 */
export const detectFieldRenames = (
  oldAttributes: Record<string, Schema.Attribute.AnyAttribute>,
  newAttributes: Record<string, Schema.Attribute.AnyAttribute>,
  deletedKeys: string[],
  newKeys: string[]
): RenameDetection[] => {
  const potentialRenames: RenameDetection[] = [];

  // For each deleted field, find the most similar new field
  deletedKeys.forEach((oldKey) => {
    const oldAttr = oldAttributes[oldKey];

    newKeys.forEach((newKey) => {
      const newAttr = newAttributes[newKey];

      if (areAttributesSimilar(oldAttr, newAttr)) {
        const score = calculateSimilarityScore(oldAttr, newAttr);
        
        // Only consider as potential rename if score is high enough
        if (score >= 60) {
          potentialRenames.push({
            oldName: oldKey,
            newName: newKey,
            score,
            oldAttribute: oldAttr,
            newAttribute: newAttr,
          });
        }
      }
    });
  });

  // Sort by score (highest first) and ensure no conflicts
  const sortedRenames = _.orderBy(potentialRenames, ['score'], ['desc']);
  
  // Filter out conflicts (same old or new name used multiple times)
  const usedOldNames = new Set<string>();
  const usedNewNames = new Set<string>();
  const finalRenames: RenameDetection[] = [];

  for (const rename of sortedRenames) {
    if (!usedOldNames.has(rename.oldName) && !usedNewNames.has(rename.newName)) {
      finalRenames.push(rename);
      usedOldNames.add(rename.oldName);
      usedNewNames.add(rename.newName);
    }
  }

  return finalRenames;
};

/**
 * Apply detected renames to the keys arrays
 * Removes renamed fields from deleted/new arrays and returns the renames
 */
export const applyRenameDetections = (
  detectedRenames: RenameDetection[],
  deletedKeys: string[],
  newKeys: string[]
): { renames: RenameDetection[]; actualDeletions: string[]; actualAdditions: string[] } => {
  const renameOldNames = new Set(detectedRenames.map((r) => r.oldName));
  const renameNewNames = new Set(detectedRenames.map((r) => r.newName));

  const actualDeletions = deletedKeys.filter((key) => !renameOldNames.has(key));
  const actualAdditions = newKeys.filter((key) => !renameNewNames.has(key));

  return {
    renames: detectedRenames,
    actualDeletions,
    actualAdditions,
  };
};
