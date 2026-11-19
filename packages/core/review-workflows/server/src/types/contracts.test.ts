// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Permission } from '@strapi/admin/strapi-admin';
import type { StagePermission } from '../../../shared/contracts/review-workflows';
import type { Equal, Expect } from './assert.test';

// The shared contracts name the permission that the admin panel exports, without loading the panel.
interface AdminPanelStagePermission extends Omit<
  Permission,
  'createdAt' | 'updatedAt' | 'properties' | 'conditions'
> {
  role: number;
}

declare const checks: [Expect<Equal<StagePermission, AdminPanelStagePermission>>];
checks satisfies unknown;
