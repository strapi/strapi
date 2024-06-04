import { SerializedError } from '@reduxjs/toolkit';
import { type ApiError, type UnknownApiError } from '@strapi/admin/strapi-admin';

type BaseQueryError = ApiError | UnknownApiError | SerializedError;

const isBaseQueryError = (error: BaseQueryError): error is ApiError | UnknownApiError => {
  return error.name !== undefined;
};

export { isBaseQueryError };
