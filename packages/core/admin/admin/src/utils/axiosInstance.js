import axios from 'axios';
import { auth } from '@strapi/helper-plugin';

const instance = axios.create({
  baseURL: process.env.STRAPI_ADMIN_BACKEND_URL,
  timeout: 1000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${auth.getToken()}`,
  },
});

export default instance;
