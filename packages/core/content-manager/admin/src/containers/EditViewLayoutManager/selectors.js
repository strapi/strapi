import pluginId from '../../pluginId';

const selectLayout = state => state.[`${pluginId}_editViewLayoutManager`].currentLayout;

export default selectLayout;
