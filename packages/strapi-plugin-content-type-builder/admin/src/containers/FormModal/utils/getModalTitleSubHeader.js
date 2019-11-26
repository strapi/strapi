import getTrad from '../../../utils/getTrad';

const getModalTitleSubHeader = state => {
  switch (state.modalType) {
    case 'chooseAttribute':
      return getTrad(
        `modalForm.sub-header.chooseAttribute.${
          state.forTarget === 'contentType' ? 'contentType' : 'component'
        }`
      );
    case 'attribute':
      return getTrad(`modalForm.sub-header.attribute.${state.actionType}`);
    default:
      return getTrad('configurations');
  }
};

export default getModalTitleSubHeader;
