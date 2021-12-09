const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const {
  MultiMatchQuery,
  SearchkitResolvers,
  SearchkitSchema,
  RefinementSelectFacet,
  RangeFacet,
  DateRangeFacet,
  TermFilter
} = require('@searchkit/schema')

class CustomFilter {
  excludeOwnFilters = false

  constructor() {}

  getIdentifier() {
    return "CustomFilter"
  }

  // returns the ES query. Requires to return a boolean query
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html
  getFilters(filters) {
    return {
      "bool": {
        "filter" : filters.map((filter) => {
          return { "term" : {"tag": filter.value }}
        })
      }
    }
  }

  // powers the appliedFilters type for all filters added
  getSelectedFilter(filterSet) {
    console.log(filterSet)
    return {
      type: 'ValueSelectedFilter',
      id: this.getIdentifier()+'_'+filterSet.value,
      identifier: this.getIdentifier(),
      label: "Custom Filter",
      value: filterSet.value,
      display: "Custom"
    }
  }
}

const searchkitConfig = {
  host: "http://127.0.0.1:9200",
  index: 'freelancers',
  hits: {
    fields: ['id','publicId', 'firstname', 'lastname', 'avatar', 'professional_title', 'primary_skills.name', 'user_type', 'speciality']
  },
  query: new MultiMatchQuery({ fields: ['firstname','professional_title','primary_skills.name', 'speciality'] }),
  sortOptions: [
    { id: 'relevance', label: "Relevance", field: [{"_score": "desc"}], defaultOption: true},
    { id: 'released', label: "Released", field: [{"released": "desc"}]},
  ],
  filter: [
    new CustomFilter()
  ]
}

const jobSearchkitConfig = {
  host: "http://127.0.0.1:9200",
  index: 'freelancers',
  hits: {
    fields: ['firstname', 'lastname', 'avatar', 'professional_title', 'primary_skills.name', 'user_type', 'speciality']
  },
  query: new MultiMatchQuery({ fields: ['firstname','professional_title','primary_skills.name', 'speciality'] }),
  sortOptions: [
    { id: 'relevance', label: "Relevance", field: [{"_score": "desc"}], defaultOption: true},
    { id: 'released', label: "Released", field: [{"released": "desc"}]},
  ],
  filter: [
    new CustomFilter(),
    new TermFilter({
      field: 'total_earning',
      identifier: 'total_earning',
      label: 'Earning',
      multipleSelect: true,
    }),
    new TermFilter({
      field: 'specialty',
      identifier: 'specialty',
      label: 'Specialty',
      multipleSelect: true,
    })
  ],
  facets: [
    // new RefinementSelectFacet({
    //   identifier: 'expertise_category',
    //   field: 'expertise_category.keyword',
    //   label: 'Category',
    //   // multipleSelect: true
    // }),
    // new RefinementSelectFacet({
    //   identifier: 'speciality',
    //   field: 'speciality.keyword',
    //   label: 'Speciality',
    //   // multipleSelect: true
    // }),
    new RefinementSelectFacet({
      identifier: 'country',
      field: 'country.keyword',
      label: 'Location',
      // display: 'ComboBoxFacet'
    }),
    new RefinementSelectFacet({
        field: 'skills_collection.keyword',
        identifier: 'skills_collection',
        label: 'Skills'
      }),
    new RefinementSelectFacet({
        field: 'experience.keyword',
        identifier: 'experience',
        label: 'Experience'
      }),
    new RefinementSelectFacet({
        field: 'language.language.keyword',
        identifier: 'language',
        label: 'Language'
      }),
    new RefinementSelectFacet({
        field: 'reviews.total_reviews',
        identifier: 'reviews',
        label: 'Reviews'
      }),


  ]
}

const { typeDefs, withSearchkitResolvers, context } = SearchkitSchema(
  {
    config: searchkitConfig, // searchkit configuration
    typeName: 'ResultSet', // base typename
    hitTypeName: 'ResultHit',
    addToQueryType: true // When true, adds a field called results to Query type
  },
  {
    config: jobSearchkitConfig, // searchkit configuration
    typeName: 'JobResultSet', // base typename
    hitTypeName: 'JobResultHit',
    addToQueryType: true // When true, adds a field called results to Query type
  }
)

const combinedTypeDefs = [
  gql`
    type Query {
      root: String
    }
    type Mutation {
      root: String
    }
    type ResultHit implements SKHit {
      id: ID!
      fields: HitFields
    }
    type HitFields {
      id: String
      publicId: String
      firstname: String
      lastname: String
      professional_title: String
      avatar: String
      speciality: [String]
      user_type: String
    }
  `,
  ...typeDefs
]

const server = new ApolloServer({
  typeDefs: combinedTypeDefs,
  resolvers: withSearchkitResolvers({}),
  context: {
    ...context
  },
  playground: true,
  introspection: true,
});



const app = express();
server.applyMiddleware({ app });

app.listen({host: "127.0.0.1", port: 4000 }, () =>
  console.log(`🚀 Server is ready at http://127.0.0.1:4000${server.graphqlPath}`)
);
