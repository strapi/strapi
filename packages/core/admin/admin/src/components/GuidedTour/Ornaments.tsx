import { Box, BoxProps, Flex, FlexProps, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';

import { STATES, States } from './constants';

/* -------------------------------------------------------------------------------------------------
 * Number
 * -----------------------------------------------------------------------------------------------*/

interface NumberProps extends FlexProps {
  children: number;
  state: States;
}

const Number = ({ children, state, ...props }: NumberProps) => {
  return state === STATES.IS_DONE || state === STATES.IS_ACTIVE ? (
    <Flex
      background="primary600"
      padding={2}
      borderRadius="50%"
      width={`3rem`}
      height={`3rem`}
      justifyContent="center"
      {...props}
    >
      {state === STATES.IS_DONE ? (
        <Check aria-hidden width={`1.6rem`} fill="neutral0" />
      ) : (
        <Typography fontWeight="semiBold" textColor="neutral0">
          {children}
        </Typography>
      )}
    </Flex>
  ) : (
    <Flex
      borderColor="neutral500"
      borderWidth="1px"
      borderStyle="solid"
      padding={2}
      borderRadius="50%"
      width={`3rem`}
      height={`3rem`}
      justifyContent="center"
      {...props}
    >
      <Typography fontWeight="semiBold" textColor="neutral600">
        {children}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VerticalDivider
 * -----------------------------------------------------------------------------------------------*/

interface VerticalDividerProps extends BoxProps {
  state: States;
}

const VerticalDivider = ({ state, ...props }: VerticalDividerProps) => (
  <Box
    width={`0.2rem`}
    height="100%"
    background={state === STATES.IS_NOT_DONE ? 'neutral300' : 'primary500'}
    hasRadius
    minHeight={state === STATES.IS_ACTIVE ? `8.5rem` : `6.5rem`}
    {...props}
  />
);

export { Number, VerticalDivider };
export type { NumberProps, VerticalDividerProps };
