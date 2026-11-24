export type ShouldOpenAdminOptions = {
  environment?: string;
  autoOpen?: boolean;
  /** Set by `strapi develop --open` or `--no-open`. `undefined` when neither flag is passed. */
  open?: boolean;
  isInitialized: boolean;
};

export const shouldOpenAdmin = ({
  environment,
  autoOpen,
  open,
  isInitialized,
}: ShouldOpenAdminOptions): boolean => {
  if (environment !== 'development') {
    return false;
  }

  if (open !== undefined) {
    return open;
  }

  return autoOpen !== false && !isInitialized;
};
