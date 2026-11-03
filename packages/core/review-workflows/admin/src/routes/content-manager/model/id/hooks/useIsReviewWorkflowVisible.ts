import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import { useParams } from 'react-router-dom';

interface UseIsReviewWorkflowVisibleProps {
  activeTab: 'draft' | 'published' | null;
}

export const useIsReviewWorkflowVisible = ({ activeTab }: UseIsReviewWorkflowVisibleProps) => {
  const {
    id,
    slug = '',
    collectionType,
  } = useParams<{
    collectionType: string;
    slug: string;
    id: string;
  }>();

  const {
    edit: { options },
  } = useDocumentLayout(slug);

  return (
    window.strapi.isEE &&
    !!options.reviewWorkflows &&
    (collectionType === 'single-types' || !!id) &&
    id !== 'create' &&
    activeTab !== 'published'
  );
};
