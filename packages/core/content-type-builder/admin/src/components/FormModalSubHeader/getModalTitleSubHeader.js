import getTrad from '../../utils/getTrad';

const getModalTitleSubHeader = ({ modalType, forTarget, kind, actionType, step }) => {
  switch (modalType) {
    case 'chooseAttribute':
      return getTrad(
        `modalForm.sub-header.chooseAttribute.${
          forTarget.includes('component') ? 'component' : kind || 'collectionType'
        }`
      );
    case 'attribute': {
      return getTrad(
        `modalForm.sub-header.attribute.${actionType}${
          step !== 'null' && step !== null && actionType !== 'edit' ? '.step' : ''
        }`
      );
    }
    case 'addComponentToDynamicZone':
      return getTrad('modalForm.sub-header.addComponentToDynamicZone');
    default:
      return getTrad('configurations');
  }
};

export default getModalTitleSubHeader;
