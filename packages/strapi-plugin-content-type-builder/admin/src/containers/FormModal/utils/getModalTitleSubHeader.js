import getTrad from '../../../utils/getTrad';

const getModalTitleSubHeader = state => {
  switch (state.modalType) {
    case 'chooseAttribute':
      return getTrad(
        `modalForm.sub-header.chooseAttribute.${
          state.forTarget === 'contentType' ? 'contentType' : 'component'
        }`
      );
    case 'attribute': {
      return getTrad(
        `modalForm.sub-header.attribute.${state.actionType}${
          state.step !== 'null' &&
          state.step !== null &&
          state.actionType !== 'edit'
            ? '.step'
            : ''
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
