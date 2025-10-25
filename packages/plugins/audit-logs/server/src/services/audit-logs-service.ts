
import type { Core } from '@strapi/types';

export default ({ strapi }: { strapi: Core.Strapi }) => ({

  /**
   * Promise to add an audit log.
   * @return {Promise}
   */
  async create(values:any) {
    return await strapi.db.query('plugin::audit-log.audit-log').create({
      data: {
        ...values,
      }
    });
  },

    /**
   * Promise to fetch an audit log.
   * @return {Promise}
   */
  findOne(params:any) {
    return strapi.query('plugin::audit-log.audit-log').findOne({
      where: params,
      populate: ['user'],
    });
  },

  /**
   * Promise to fetch all audit logs. Pagination supported.
   * @return {Promise}
   */
  async findMany(params:any) {
    const {
      pagination = {},
      sort = {},
      filters = {},
      _q = '',
    } = params

    const queryParams: any = {
      populate: ['user'],
    }

    if(sort && sort.hasOwnProperty('field') && sort.hasOwnProperty('order')) {
      queryParams['orderBy'] = {
        [sort.field]: sort.order
      }
    } else {
      queryParams['orderBy'] = {
        date: 'desc'
      }
    }

    if(filters && Object.keys(filters).length > 0) {
      queryParams['where'] = filters
    }

    if (pagination.pageSize) {
      queryParams['limit'] = parseInt(pagination.pageSize)
    }

    if (pagination.page) {
      queryParams['offset'] = (parseInt(pagination.page) - 1) * parseInt(pagination.pageSize)
    }

    if(_q) {
      queryParams['_q'] = _q;
    }

    const count = await strapi.query('plugin::audit-log.audit-log').count({
      ...(queryParams.hasOwnProperty('where') && {where: queryParams['where']}),
      ...(queryParams.hasOwnProperty('_q') && {_q: queryParams['_q']})
    });

    const data = await strapi.query('plugin::audit-log.audit-log').findMany(queryParams);

    return {
      data,
      pagination: {
        pageSize: parseInt(pagination.pageSize),
        page: parseInt(pagination.page),
        pageCount: Math.ceil(count / parseInt(pagination.pageSize)),
        total: count
      }
    };
  },
});