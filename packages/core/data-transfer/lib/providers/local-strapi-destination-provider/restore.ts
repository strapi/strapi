import type { ContentTypeSchema } from '@strapi/strapi';


const defaultExceptions = ['admin::permission', 'admin::user', 'admin::role', 'admin::api-token', 'admin::api-token-permission', 'plugin::i18n.locale']

export type DeleteOptions = {
    exceptions?: string[],
    conditions?: {
        [contentTypeUid: string]: {
            where: any
        }
    }
}

export const deleteAllRecords = async (strapi: Strapi.Strapi, deleteOptions?: DeleteOptions) => {
    const conditions = deleteOptions?.conditions ?? {};
    const exceptions = deleteOptions?.exceptions ?? defaultExceptions;
    const contentTypes: ContentTypeSchema[] = Object.values(strapi.contentTypes);
    let count = 0;
    await Promise.all(contentTypes.map(async (contentType) => {
        const filters = conditions[contentType.uid] ?? {}
        if (!exceptions.includes(contentType.uid)) {
            const result = await strapi?.db.query(contentType.uid).deleteMany({
                filters
            });
            count += result.count;
        }
    }))

    return { count }
}