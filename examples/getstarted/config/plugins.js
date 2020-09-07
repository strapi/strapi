module.exports = ({ env }) => ({
  graphql: {
    amountLimit: 5,
    depthLimit: 10,
    apolloServer: {
      tracing: true,
    },
  },
});
