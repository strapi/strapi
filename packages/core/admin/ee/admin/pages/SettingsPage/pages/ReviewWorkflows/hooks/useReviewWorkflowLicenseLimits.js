import { useLicenseLimits } from '../../../../../hooks';

export function useReviewWorkflowLicenseLimits() {
  const { license, isLoading } = useLicenseLimits();
  const limits =
    license?.data?.features?.filter(({ name }) => name === 'review-workflows')?.[0]?.options ?? {};

  return {
    limits,
    isLoading,
  };
}
