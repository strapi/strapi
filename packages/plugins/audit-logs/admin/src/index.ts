import pluginId from './pluginId';

export default {
  register(app: any) {
    app.registerPlugin({
      id: pluginId,
      name: 'Audit Logs',
    });
  },
  bootstrap(app: any) {},
};

