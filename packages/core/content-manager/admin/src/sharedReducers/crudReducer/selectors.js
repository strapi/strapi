import pluginId from '../../pluginId';

const selectCrudReducer = state => state[`${pluginId}_editViewCrudReducer`];

export default selectCrudReducer;
