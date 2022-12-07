export default () => ({
  // TODO: Investigate why the `value` here is a Promise for some reason
  toEntityResponse(value: any, info: { args?: any; resourceUID?: string } = {}) {
    const { args = {}, resourceUID } = info;

    return { value, info: { args, resourceUID } };
  },

  toEntityResponseCollection(nodes: any[], info: { args?: any; resourceUID?: any } = {}) {
    const { args = {}, resourceUID } = info;

    return { nodes, info: { args, resourceUID } };
  },
});
