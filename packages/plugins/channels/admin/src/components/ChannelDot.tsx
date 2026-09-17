import { Box } from '@strapi/design-system';

/** The small colour swatch every channel carries in pickers, tables and badges. */
export const ChannelDot = ({ color, size = '10px' }: { color: string | null; size?: string }) => (
  <Box
    width={size}
    height={size}
    borderRadius="50%"
    background={color ?? 'neutral300'}
    shrink={0}
    aria-hidden
  />
);
