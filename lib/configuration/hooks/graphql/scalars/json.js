const GraphQL = require('graphql');
const GraphQLLanguage = require('graphql/language');
const Kind = GraphQLLanguage.Kind;

const GraphQLJson = new GraphQL.GraphQLScalarType({
  name: 'JSON',
  description: 'The `JSON` scalar type to support raw JSON values.',
  serialize: value => value,
  parseValue: value => value,
  parseLiteral: tree => {
    const parser = getParser[tree.kind];
    return parser.call(this, tree);
  }
});

function getParser(kind) {
  switch (kind) {
    case Kind.INT:
      return tree => GraphQL.GraphQLInt.parseLiteral(tree);

    case Kind.FLOAT:
      return tree => GraphQL.GraphQLFloat.parseLiteral(tree);

    case Kind.BOOLEAN:
      return tree => GraphQL.GraphQLBoolean.parseLiteral(tree);

    case Kind.STRING:
      return tree => GraphQL.GraphQLString.parseLiteral(tree);

    case Kind.ENUM:
      return tree => String(tree.value);

    case Kind.LIST:
      return tree => tree.values.map(node => GraphQLJson.parseLiteral(node));

    case Kind.OBJECT:
      return tree => tree.fields.reduce((fields, field) => {
        fields[field.name.value] = GraphQLJson.parseLiteral(field.value);
        return fields;
      }, {});

    default:
      return null;
  }
}

module.exports = GraphQLJson;
