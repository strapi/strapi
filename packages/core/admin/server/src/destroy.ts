import { getService } from './utils';

export default async () => {
  const { conditionProvider, actionProvider } = getService('permission');

  await conditionProvider.clear();
  await actionProvider.clear();
};
