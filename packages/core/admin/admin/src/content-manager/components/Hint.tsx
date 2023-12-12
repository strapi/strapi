import { Typography } from '@strapi/design-system';

interface HintProps {
  id?: string;
  error?: string;
  name: string;
  hint?: string;
}

const Hint = ({ id, error, name, hint = '' }: HintProps) => {
  if (hint.length === 0 || error) {
    return null;
  }

  return (
    <Typography as="p" variant="pi" id={`${id || name}-hint`} textColor="neutral600">
      {hint}
    </Typography>
  );
};

export { Hint };
export type { HintProps };
