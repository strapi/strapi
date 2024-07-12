import { Flex, Button } from '@strapi/design-system';
const DeployButton = ({ onClick, disabled }) => {
  return (
    <Flex direction="row" paddingTop={4} alignItems="flex-start">
      <Button onClick={onClick} disabled={disabled} variant="default" size="M">
        Deploy
      </Button>
    </Flex>
  );
};

export { DeployButton };
