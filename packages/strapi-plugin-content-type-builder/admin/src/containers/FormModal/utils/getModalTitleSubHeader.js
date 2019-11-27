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
      // if (state.step) {
      //   return getTrad(`modalForm.sub-header.attribute.${state.actionType}`);
      // }
      return getTrad(
        `modalForm.sub-header.attribute.${state.actionType}${
          state.step !== 'null' && state.step !== null ? '.step' : ''
        }`
      );
    }
    default:
      return getTrad('configurations');
  }
};

export default getModalTitleSubHeader;
