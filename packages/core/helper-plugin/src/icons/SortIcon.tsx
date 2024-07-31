import * as React from 'react';

import { CarretDown } from '@strapi/icons';
import styled from 'styled-components';

export interface SortIconProps extends React.SVGProps<SVGSVGElement> {
  isUp?: boolean;
}

const transientProps: Partial<Record<keyof SortIconProps, boolean>> = {
  isUp: true,
};

const SortIcon = styled(CarretDown).withConfig<SortIconProps>({
  shouldForwardProp: (prop, defPropValFN) => !transientProps[prop] && defPropValFN(prop),
})`
  transform: ${({ isUp = false }) => `rotate(${isUp ? '180' : '0'}deg)`};
`;

export { SortIcon };
