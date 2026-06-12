import { Typography, Flex, Box, Link } from '@strapi/design-system';
import { Check, Loader, Cross, ChevronDown } from '@strapi/icons';
import { Link as RouterLink } from 'react-router-dom';
import { styled, keyframes } from 'styled-components';

import { MarkerContent } from '../../lib/types/messages';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../Collapsible';

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

const Status = ({ status }: { status: string }) => {
  switch (status) {
    case 'update':
      return (
        <Typography fontWeight="semiBold" textColor="warning500">
          M
        </Typography>
      );
    case 'remove':
      return (
        <Typography fontWeight="semiBold" textColor="danger500">
          D
        </Typography>
      );
    case 'create':
      return (
        <Typography fontWeight="semiBold" textColor="success500">
          N
        </Typography>
      );
    default:
      return null;
  }
};

export const Marker = ({ title, steps, state }: MarkerContent) => {
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
          <Flex gap={3} padding={3} direction="column">
            {steps.map((step) => (
              <Flex
                key={step.id}
                gap={2}
                justifyContent="space-between"
                width="100%"
                padding={[0, 1]}
              >
                {/* <Typography>{step.description}</Typography> */}
                {step.link ? (
                  <Link tag={RouterLink} to={step.link}>
                    <Typography>{step.description}</Typography>
                  </Link>
                ) : (
                  <Typography>{step.description}</Typography>
                )}
                <Status status={step.status} />
              </Flex>
            ))}
          </Flex>
        </CollapsibleContent>
      </Collapsible>
    </Box>
  );
};
