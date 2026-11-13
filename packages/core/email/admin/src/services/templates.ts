import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import type {
  TemplateContent,
  TemplateDetail,
  TemplateSummary,
} from '../../../shared/contracts/templates';

const QUERY_KEY = ['email', 'templates'];

/** The key comes from the URL: encode it so it can never reach another endpoint. */
const templatePath = (key: string, suffix = '') =>
  `/email/templates/${encodeURIComponent(key)}${suffix}`;

/** The list, optionally narrowed to the keys that start with `prefix`. */
const useTemplates = (prefix?: string) => {
  const { get } = useFetchClient();

  return useQuery([...QUERY_KEY, 'list', prefix ?? ''], async () => {
    const { data } = await get<{ data: TemplateSummary[] }>('/email/templates', {
      params: prefix ? { prefix } : undefined,
    });

    return data.data;
  });
};

const useTemplate = (key: string, locale: string) => {
  const { get } = useFetchClient();

  return useQuery([...QUERY_KEY, 'detail', key, locale], async () => {
    const { data } = await get<{ data: TemplateDetail }>(templatePath(key), {
      params: { locale },
    });

    return data.data;
  });
};

/**
 * Locales configured in the admin. Needs the i18n plugin; without it the chooser only offers the
 * locales the template already has.
 */
const useAdminLocales = () => {
  const { get } = useFetchClient();

  return useQuery([...QUERY_KEY, 'locales'], async () => {
    try {
      const { data } = await get<Array<{ code: string }>>('/i18n/locales');

      return data.map((locale) => locale.code);
    } catch {
      return [];
    }
  });
};

const useUpdateTemplate = (key: string, locale: string) => {
  const { put } = useFetchClient();
  const queryClient = useQueryClient();

  return useMutation(
    async (body: TemplateContent) => {
      const { data } = await put<{ data: TemplateDetail }>(templatePath(key), body, {
        params: { locale },
      });

      return data.data;
    },
    { onSuccess: () => queryClient.invalidateQueries(QUERY_KEY) }
  );
};

const useResetTemplate = (key: string, locale: string) => {
  const { del } = useFetchClient();
  const queryClient = useQueryClient();

  return useMutation(
    async () => {
      await del(templatePath(key), { params: { locale } });
    },
    { onSuccess: () => queryClient.invalidateQueries(QUERY_KEY) }
  );
};

/**
 * Sends the content in the editor, filled with sample data, to the signed-in admin. It does not have to be
 * saved: the server cleans and checks it the way it does a save.
 */
const useSendTestTemplate = (key: string, locale: string) => {
  const { post } = useFetchClient();

  return useMutation(async (body: TemplateContent) => {
    await post(templatePath(key, '/test'), body, { params: { locale } });
  });
};

export {
  useAdminLocales,
  useResetTemplate,
  useSendTestTemplate,
  useTemplate,
  useTemplates,
  useUpdateTemplate,
};
