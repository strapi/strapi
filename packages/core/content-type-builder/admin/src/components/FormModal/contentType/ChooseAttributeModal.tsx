import { Modal } from '@strapi/design-system';

import { AttributeOptions } from '../../AttributeOptions/AttributeOptions';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { FormModal } from '../components/Modal';
import { getAttributesToDisplay } from '../utils/getAttributesToDisplay';

export const ChooseAttributeModal = () => {
  const { kind, onCloseModal, targetUid, forTarget } = useFormModalNavigation();
  const { nestedComponents, components, contentTypes } = useDataManager();

  const icon = forTarget === 'component' ? 'component' : (kind ?? 'collectionType');

  const type = forTarget === 'component' ? components[targetUid] : contentTypes[targetUid];

  const displayName = type?.info.displayName;

  const breadcrumbs = [
    {
      label: displayName,
      info: {
        category: ('category' in type && type?.category) || '',
        name: type?.info?.displayName,
      },
    },
  ];

  // Display data for the attributes picker modal
  const displayedAttributes = getAttributesToDisplay(
    forTarget,
    targetUid,
    // We need the nested components so we know when to remove the component option
    nestedComponents
  );

  return (
    <Modal.Root open onOpenChange={onCloseModal}>
      <Modal.Content>
        <FormModal.Header icon={icon} breadcrumbs={breadcrumbs} />
        <AttributeOptions
          attributes={displayedAttributes}
          forTarget={forTarget}
          kind={kind ?? 'collectionType'}
        />
      </Modal.Content>
    </Modal.Root>
  );
};
