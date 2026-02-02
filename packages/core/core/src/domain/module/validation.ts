import { yup } from '@strapi/utils';

const strapiServerSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction(),
    destroy: yup.mixed().isFunction(),
    register: yup.mixed().isFunction(),
    config: yup.object(),
    routes: yup.lazy((value) => {
      if (Array.isArray(value)) {
        return yup.array();
      }
      return yup.object();
    }),
    controllers: yup.object(),
    services: yup.object(),
    policies: yup.object(),
    middlewares: yup.object(),
    contentTypes: yup.object(),
  })
  .noUnknown();

const validateModule = (data: unknown) => {
  return strapiServerSchema.validateSync(data, { strict: true, abortEarly: false });
};

export { validateModule };
