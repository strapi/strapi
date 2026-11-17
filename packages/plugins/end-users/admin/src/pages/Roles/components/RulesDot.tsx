import * as React from 'react';

import { Box } from '@strapi/design-system';

/**
 * The 6px primary dot the role editor puts where something is set: the admin's own is the same size
 * (`ContentTypeCollapses`). A caller positions it, or gives it a name when it stands alone.
 */
const RulesDot = (props: React.ComponentProps<typeof Box>) => (
  <Box
    tag="span"
    display="block"
    width="6px"
    height="6px"
    borderRadius="20px"
    background="primary600"
    {...props}
  />
);

export { RulesDot };
