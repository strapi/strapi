import commonTrads from './commonTrads.json';

const formatMessagesWithPluginId = (pluginId, messages) => {
  return Object.keys(messages).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = messages[current];

    return acc;
  }, commonTrads);
};

export default formatMessagesWithPluginId;
