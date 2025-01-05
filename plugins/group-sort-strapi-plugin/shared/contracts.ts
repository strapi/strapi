import { GridDirection } from "./types"

/**
 * Group metadata
 */
export interface GroupResultMeta {
  groupName: string,
  orderField: string,
  order2dDirection: GridDirection
}

/**
 * Group metadata and items in group
 */
export interface GroupResult extends GroupResultMeta {
  items: any[]
}

/**
 * Item andmetadatas of groups it belongs to
 */
export interface GroupResultItem {
  item: any,
  groups: GroupResultMeta[]
}

export interface MultilinePosition {
  row: number,
  column: number
}