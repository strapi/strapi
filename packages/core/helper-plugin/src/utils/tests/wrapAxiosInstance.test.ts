import axios, { AxiosInstance } from 'axios';

import { wrapAxiosInstance } from '../wrapAxiosInstance';

const axiosInstance = axios.create({
  baseURL: 'https://some-domain.com/api/',
  timeout: 1000,
  headers: { 'X-Custom-Header': 'foobar' },
});

describe('wrapAxiosInstance', () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it('has the right methods', () => {
    const wrappedAxiosInstance = wrapAxiosInstance(axiosInstance);

    expect(wrappedAxiosInstance.request).toBeDefined();
    expect(wrappedAxiosInstance.get).toBeDefined();
    expect(wrappedAxiosInstance.head).toBeDefined();
    expect(wrappedAxiosInstance.delete).toBeDefined();
    expect(wrappedAxiosInstance.options).toBeDefined();
    expect(wrappedAxiosInstance.post).toBeDefined();
    expect(wrappedAxiosInstance.put).toBeDefined();
    expect(wrappedAxiosInstance.patch).toBeDefined();
    expect(wrappedAxiosInstance.getUri).toBeDefined();

    expect((wrappedAxiosInstance as unknown as AxiosInstance).defaults).not.toBeDefined();
    expect((wrappedAxiosInstance as unknown as AxiosInstance).interceptors).not.toBeDefined();
    expect((wrappedAxiosInstance as unknown as AxiosInstance).postForm).not.toBeDefined();
    expect((wrappedAxiosInstance as unknown as AxiosInstance).putForm).not.toBeDefined();
    expect((wrappedAxiosInstance as unknown as AxiosInstance).patchForm).not.toBeDefined();
  });

  it('logs a deprecation warning in development', () => {
    console.warn = jest.fn();
    process.env.NODE_ENV = 'development';

    const wrappedAxiosInstance = wrapAxiosInstance(axiosInstance);
    wrappedAxiosInstance.request({ url: 'foo' });

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('does not log deprecation warnings in production', () => {
    console.warn = jest.fn();
    process.env.NODE_ENV = 'production';

    const wrappedAxiosInstance = wrapAxiosInstance(axiosInstance);
    wrappedAxiosInstance.request({ url: 'foo' });

    expect(console.warn).toHaveBeenCalledTimes(0);
  });
});
