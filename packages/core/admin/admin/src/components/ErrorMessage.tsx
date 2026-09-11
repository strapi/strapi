import { Typography } from '@strapi/design-system';

/**
 * Shared "the last mutation in this dialog failed" banner, used by both `EnrolDialog` and
 * `ReAuthDialog`.
 */
const ErrorMessage = ({ error }: { error?: string }) => {
  if (!error) {
    return null;
  }

  return (
    <Typography role="alert" textColor="danger600">
      {error}
    </Typography>
  );
};

export { ErrorMessage };
