import { Typography, Flex, Box } from '@strapi/design-system';
import { Check, Loader, Cross, ChevronDown } from '@strapi/icons';
import { styled, keyframes } from 'styled-components';

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../Collapsible';

interface Step {
  id: string;
  description: string;
}

interface MarkerProps {
  title: string;
  state: 'success' | 'loading' | 'error';
  steps: Step[];
}

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinningLoader = styled(Loader)`
  animation: ${rotate} 1s linear infinite;
`;

const RotatingIcon = styled(Box)<{ $open: boolean }>`
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  transition: transform ${({ theme }) => theme.motion.timings['200']}
    ${({ theme }) => theme.motion.easings.easeOutQuad};
`;

export const Marker = ({ title, steps, state }: MarkerProps) => {
  const getStateIcon = () => {
    switch (state) {
      case 'success':
        return <Check fill="success500" />;
      case 'loading':
        return <SpinningLoader />;
      case 'error':
        return <Cross fill="danger500" />;
      default:
        return null;
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderColor="neutral200"
      borderStyle="solid"
      hasRadius
      marginBottom={3}
      width={'336px'}
    >
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger>
          {({ open }) => (
            <Box
              padding={3}
              borderColor="neutral200"
              borderWidth={open ? '0 0 1px 0' : '0'}
              borderStyle="solid"
            >
              <Flex gap={2} alignItems="center">
                {getStateIcon()}
                <Typography>{title}</Typography>
                <Flex marginLeft="auto">
                  <RotatingIcon as={ChevronDown} $open={open} />
                </Flex>
              </Flex>
            </Box>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Box padding={3}>
            <Flex gap={2} direction="column" alignItems="flex-start">
              {steps.map((step) => (
                <div key={step.id}>
                  <Flex gap={2} alignItems="center">
                    {getStateIcon()}
                    <Typography>{step.description}</Typography>
                  </Flex>
                </div>
              ))}
            </Flex>
          </Box>
        </CollapsibleContent>
      </Collapsible>
    </Box>
  );
};
