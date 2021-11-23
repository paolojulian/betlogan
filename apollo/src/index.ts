import { ApolloServer, ApolloError, ValidationError, gql } from 'apollo-server';
import * as firebaseAdmin from 'firebase-admin';

const serviceAccount = require('../service-account.json');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
})

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    birthday: String!
    items: [Item]
  }

  type Item {
    id: ID!
    userId: User!
    user: User!
    title: String!
    content: String!
    comments: [Comment]
  }

  type Comment {
    id: ID!
    content: String!
    userId: User!
  }

  type Query {
    items: [Item]
    user(id: String!): User
  }
`;

const resolvers = {
  User: {
    async items(user) {
      try {
        const userItems = await firebaseAdmin
          .firestore()
          .collection('items')
          .where('userId', '==', user.id)
          .get();

        return userItems.docs.map((item) => item.data());
      } catch (e) {
        throw new ApolloError(e);
      }
    }
  },
  Item: {
    async user(item) {
      try {
        const itemAuthor = await firebaseAdmin
          .firestore()
          .doc(`users/${item.userId}`)
          .get();

        return itemAuthor.data();
      } catch (e) {
        throw new ApolloError(e);
      }
    }
  },
  Query: {
    async items() {
      const items = await firebaseAdmin
        .firestore()
        .collection('items')
        .get();
      
      return items.docs.map((item) => item.data());
    },
    async user(_, args) {
      try {
        const userDoc = await firebaseAdmin
          .firestore()
          .doc(`users/${args.id}`)
          .get();
        const user = userDoc.data();

        return user || new ValidationError('User not found.')
      } catch (e) {
        throw new ApolloError(e);
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
})

server.listen()
  .then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`)
  })
