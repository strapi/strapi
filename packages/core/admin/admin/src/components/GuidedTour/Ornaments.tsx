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
      width={`${30 / 16}rem`}
      height={`${30 / 16}rem`}
      justifyContent="center"
      {...props}
    >
      {state === STATES.IS_DONE ? (
        <Check aria-hidden width={`${16 / 16}rem`} color="neutral0" />
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
      width={`${30 / 16}rem`}
      height={`${30 / 16}rem`}
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
    width={`${2 / 16}rem`}
    height="100%"
    background={state === STATES.IS_NOT_DONE ? 'neutral300' : 'primary500'}
    hasRadius
    minHeight={state === STATES.IS_ACTIVE ? `${85 / 16}rem` : `${65 / 16}rem`}
    {...props}
  />
);

export { Number, VerticalDivider };
export type { NumberProps, VerticalDividerProps };
