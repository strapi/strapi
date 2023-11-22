import { getFetchClient } from '@strapi/helper-plugin';

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

/* -------------------------------------------------------------------------------------------------
 * Axios data
 * -----------------------------------------------------------------------------------------------*/
export interface QueryArguments<TSend> {
  url: string;
  method: 'PUT' | 'GET' | 'POST' | 'DELETE';
  data?: TSend;
  config?: AxiosRequestConfig<TSend>;
}

const axiosBaseQuery = async <TData = any, TSend = any>({
  url,
  method,
  data,
  config,
}: QueryArguments<TSend>) => {
  try {
    const { get, post, del, put } = getFetchClient();

    if (method === 'POST') {
      const res = await post<TData, AxiosResponse<TData>, TSend>(url, data, config);
      return { data: res.data };
    }
    if (method === 'DELETE') {
      const res = await del<TData, AxiosResponse<TData>, TSend>(url, config);
      return { data: res.data };
    }
    if (method === 'PUT') {
      const res = await put<TData, AxiosResponse<TData>, TSend>(url, data, config);
      return { data: res.data };
    }

    /**
     * Default is GET.
     */
    const res = await get<TData, AxiosResponse<TData>, TSend>(url, config);
    return { data: res.data };
  } catch (error) {
    const err = error as AxiosError;

    /**
     * This format mimics what we want from an AxiosError which is what the
     * rest of the app works with, except this format is "serializable" since
     * it goes into the redux store.
     *
     * NOTE – passing the whole response will highlight this "serializability" issue.
     */
    return {
      error: {
        status: err.response?.status,
        code: err.code,
        response: {
          data: err.response?.data,
        },
      },
    };
  }
};

/* -------------------------------------------------------------------------------------------------
 * Axios error
 * -----------------------------------------------------------------------------------------------*/

/**
 * This asserts the errors from redux-toolkit-query are
 * axios errors so we can pass them to our utility functions
 * to correctly render error messages.
 */
const isErrorAxiosError = (err: unknown): err is AxiosError<{ error: any }> => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof err.response === 'object' &&
    err.response !== null &&
    'data' in err.response
  );
};

export { isErrorAxiosError, axiosBaseQuery };
