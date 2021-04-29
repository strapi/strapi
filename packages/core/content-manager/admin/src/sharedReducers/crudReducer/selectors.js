import pluginId from '../../pluginId';

const selectCrudReducer = state => state.get(`${pluginId}_editViewCrudReducer`);

export default selectCrudReducer;
