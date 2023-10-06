import { getTrad } from '../../utils/getTrad';

type ModalTitleProps = {
  forTarget?: Array<string>;
  step?: string;
  kind?: string;
  modalType?: string;
  actionType?: string;
};

export const getModalTitleSubHeader = ({
  modalType,
  forTarget,
  kind,
  actionType,
  step,
}: ModalTitleProps) => {
  switch (modalType) {
    case 'chooseAttribute':
      return getTrad(
        `modalForm.sub-header.chooseAttribute.${
          forTarget?.includes('component') ? 'component' : kind || 'collectionType'
        }`
      );
    case 'attribute': {
      return getTrad(
        `modalForm.sub-header.attribute.${actionType}${
          step !== 'null' && step !== null && actionType !== 'edit' ? '.step' : ''
        }`
      );
    }
    case 'customField': {
      return getTrad(`modalForm.sub-header.attribute.${actionType}`);
    }
    case 'addComponentToDynamicZone':
      return getTrad('modalForm.sub-header.addComponentToDynamicZone');
    default:
      return getTrad('configurations');
  }
};
