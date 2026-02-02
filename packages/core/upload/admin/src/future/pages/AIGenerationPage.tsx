import { Layouts } from '@strapi/admin/strapi-admin';
import { Button } from '@strapi/design-system';

export const AIGenerationPage = () => {
  return (
    <Layouts.Root>
      <Layouts.Header title="AI Generation" primaryAction={<Button>TODO: Generate</Button>} />

      <Layouts.Content>TODO: AI ListView</Layouts.Content>
    </Layouts.Root>
  );
};
