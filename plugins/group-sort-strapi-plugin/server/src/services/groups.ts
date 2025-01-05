import type { Core } from '@strapi/strapi';
import { get } from 'lodash';
import { GroupResult, GroupResultItem, GroupResultMeta } from '../../../shared/contracts';
import { GridDirection } from "../../../shared/types";
import { ContentTypeNotFoundError, GroupNameFieldNotFound } from '../../../shared/errors';
import { GROUPABLE_FIELDS_REQUIRING_POPULATE, PLUGIN_ID, UNDEFINED_GROUP_NAME } from '../../../shared/constants';

const THROW_IF_GROUP_NAME_FIELD_NOT_FOUND = false;


function extractValue (arg: any): any {
  if (Array.isArray(arg)) {
    arg = arg[0];
  }

  if (typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'boolean' || arg === null || arg === undefined) {
    return arg;
  }

  if (typeof arg === 'object' && arg !== null) {
    return arg.name || arg.title || arg.id || arg.documentId || null;
  }

  return null;
};

const getGroupConfigs = (strapi, uid) => {
  const contentType = strapi.contentTypes[uid];
  if (!contentType) {
    throw new ContentTypeNotFoundError(uid);
  }

  const groupConfigs: {
    orderField: string;
    groupNameField: string;
    order2dDirection: GridDirection;
  }[] = [];

  for (const key in contentType.attributes) {
    const attr = contentType.attributes[key];

    if (attr.customField && !attr.customField.toString().startsWith(`plugin::${PLUGIN_ID}`)) {
      continue;
    }

    const groupNameField = get(attr, ['options', 'group', 'groupNameField']) as string;
    if (!groupNameField) continue;

    if (!contentType.attributes[groupNameField]) {
      if (THROW_IF_GROUP_NAME_FIELD_NOT_FOUND) throw new GroupNameFieldNotFound(groupNameField);
      continue;
    }

    groupConfigs.push({
      orderField: key,
      groupNameField,
      order2dDirection: get(attr, ['options', 'group', 'order2dDirection']) as GridDirection,
    });
  }

  return groupConfigs;
};

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getGroup(ctx): Promise<GroupResult> {
    const { uid, groupField } = ctx.params;
    let groupName = ctx.params.groupName as string;
    if(groupName === UNDEFINED_GROUP_NAME) {
      groupName = undefined;
    }

    const groupConfigs = getGroupConfigs(strapi, uid);
    const groupConfig = groupConfigs.find((groupConfig) => groupConfig.orderField === groupField);
    if (!groupConfig) {
      return null;
    }

    const attributeNames = Object.keys(strapi.contentTypes[uid].attributes);
    const groupableFields = attributeNames
      .map((key) => {
        const attr = strapi.contentTypes[uid].attributes[key];
        if (!GROUPABLE_FIELDS_REQUIRING_POPULATE.includes(attr.type)) return null;

        return key;
      })
      .filter((v) => v);

    const entities = await strapi.documents(uid).findMany({ populate: groupableFields });
    const group: GroupResult = {
      groupName: groupConfig.groupNameField,
      orderField: groupConfig.orderField,
      order2dDirection: groupConfig.order2dDirection,
      items: [],
    };

    for (const entity of entities) {
      const entityGroupName = extractValue(get(entity, groupConfig.groupNameField)) as string;
      if (groupName !== entityGroupName) continue;

      group.items.push(entity);
    }

    return group;
  },

  async getItemsWithGroups(ctx): Promise<GroupResultItem[]> {
    const { uid } = ctx.params;

    const attributeNames = Object.keys(strapi.contentTypes[uid].attributes);
    const groupableFields = attributeNames
      .map((key) => {
        const attr = strapi.contentTypes[uid].attributes[key];
        if (!GROUPABLE_FIELDS_REQUIRING_POPULATE.includes(attr.type)) return null;

        return key;
      })
      .filter((v) => v);

    const groupConfigs = getGroupConfigs(strapi, uid);
    const entities = await strapi.documents(uid).findMany({populate: groupableFields});
    const result: GroupResultItem[] = [];

    for (const entity of entities) {
      
      result.push({
        item: entity,
        groups: groupConfigs.map((groupConfig) => ({
          groupName: extractValue(get(entity, groupConfig.groupNameField)) || UNDEFINED_GROUP_NAME,
          orderField: groupConfig.orderField,
          order2dDirection: groupConfig.order2dDirection,
        })),
      });
    }

    return result;
  },

  async getGroupsWithItems(ctx): Promise<GroupResult[]> {
    const itemsWithGroups = await this.getItemsWithGroups(ctx);
    const groupsDict: Record<string, GroupResult> = {};

    for (const item of itemsWithGroups) {
      for (const group of item.groups) {
        const key = JSON.stringify(group);
        if (!groupsDict[key]) {
          groupsDict[key] = {
            groupName: group.groupName,
            orderField: group.orderField,
            order2dDirection: group.order2dDirection,
            items: [],
          };
        }

        groupsDict[key].items.push(item.item);
      }
    }

    return Object.values(groupsDict);
  },

  async getGroupNames(ctx): Promise<GroupResultMeta[]> {
    const itemsWithGroups = await this.getItemsWithGroups(ctx);
    const groupsDict: Record<string, GroupResultMeta> = {};

    for (const item of itemsWithGroups) {
      for (const group of item.groups) {
        const key = JSON.stringify(group);
        groupsDict[key] = group;
      }
    }

    return Object.values(groupsDict);
  },
});

export default service;
