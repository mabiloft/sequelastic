# Sequelastic

:warning: **This version only works with sequelize-typescript 1.1.x**

## The first sequelize-typescript and ElasticSearch bridge tool

- [installation](#installation)
- [usage](#usage)
- [Sequelastic functions](#sequelastic-functions)
- [Sequelastic types](#sequelastic-types)

## installation

### prerequisites:

- [sequelize-typescript](https://www.npmjs.com/package/sequelize-typescript)
- [@elastic/elasticsearch](https://www.npmjs.com/package/@elastic/elasticsearch)

in order to install sequelastic on your project just run:

```shell
npm install sequelastic
```

## usage

first of all import and instantiate the utility:

```typescript
import Sequelastic from "sequelastic";
import { model1, model2 } from "./sequelize-typescript-models";

const sequelastic = new Sequelastic({
  node: "https://elastiSearchSevice.example:9200",
  models: [model1, model2],
});
```

then sync your database with the elasticSearch service:

```typescript
sequelastic
  .sync()
  .then((success) => {
    if (success) {
      console.log("Database synced correctly");
    } else {
      console.log("Something went wrong");
    }
  })
  .catch((err) => {
    console.error(err);
  });
```

now you are ready to search whatever you want with sequelastic:

```typescript
sequelastic
  .search("foo", "bar", { fuzzy: true, fuzziness: "AUTO" })
  .then((results) => {
    console.log(results);
  })
  .catch((err) => {
    console.error(err);
  });
```

---

## Sequelastic Functions

### Constructor

_create new Sequelastic instance_

```ts
new Sequelastic(config: SequelasticContructorProps) => Sequelastic
```

| property |                            type                            |  description  | default |
| :------: | :--------------------------------------------------------: | :-----------: | :-----: |
|  config  | [SequelasticConstructorProps](#sequelasticcontructorprops) | config object |  none   |

</br>

### Sync

_Sync SQL database_

this function will sync your database with the elasticSearch service using the following method:
- Deleting all the pre-existing indices
- Recreating all the indices using as index name the plural of the model name
- using bulk insertion to add all the corresponding records

```typescript
sequelastic.sync() => void
```

| property |                         type                          |  description  | default |
| :------: | :---------------------------------------------------: | :-----------: | :-----: |
| options  | [SequelasticSyncOptions](#sequelasticcontructorprops) | config object |  none   |



</br>

### Search

_Search in indices something_

this function  will search in elasticSearch using the search type [query_string](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html)

```typescript
sequelastic.search(query: string, index: string, options:SequelasticSearchOptions) => Promise<[{[key: string]: any}]> // options.wholeResponse = false

sequelastic.search(query: string, index:string, options: SequelizeSearchOptions) => Promise<elasticSearch.ApiResponse<Record<string, any>, Record<string, unknown>>> // options.wholeResponse = true
```

| property |                         type                          |             description              |  default  |
| :------: | :---------------------------------------------------: | :----------------------------------: | :-------: |
|  query   |                        string                         |    the elasticSearch query string    |   none    |
|  index   |                        string                         | the index where search for something |   "\*"    |
| options  | [SequelasticSearchOptions](#sequelasticsearchoptions) |            search options            | undefined |


</br>

### customSearch

_use a custom body for the elasticSearch \_search_

```typescript
sequelastic.customSearch(params: elasticSearch.RequestParams.Search) => Promise<
    elasticSearch.ApiResponse<Record<string, any>, Record<string, unknown>>
  >
```

| property |                                                                    type                                                                     |         description         | default |
| :------: | :-----------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------: | :-----: |
|  params  | [elasicSearch.RequestParams.Search](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#_search) | the custom search parameter |  none   |

</br>

---

## Sequelastic Types

### SequelasticContructorProps

_object_

|         key          |                                                           type                                                           |                        description                        |        default        |
| :------------------: | :----------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------: | :-------------------: |
|         node         |    [string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String?retiredLocale=it)    |              elasticsearch service endpoint               | http://localhost:9200 |
|        models        | ([Model](https://sequelize.org/master/class/lib/model.js~Model.html) \| [SequelasticModelType](#sequelasticmodeltype))[] |              list of all the models to index              |          []           |
| exclude _(optional)_ |   [string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String?retiredLocale=it)[]   | list of the model's fields to globally exclude from index |      _undefined_      |

</br>

### SequelasticModelType

_object_

| key                     | type                                                                                                                                                                                                                                                    | description                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| model                   | [Model](https://sequelize.org/master/class/lib/model.js~Model.html)                                                                                                                                                                                     | sequelize model to be indexed                           |
| attributes _(optional)_ | [string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String?retiredLocale=it)[] \| {exclude: [string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String?retiredLocale=it)[]} | fields to include or exclude in index                   |
| include _(optional)_    | ([string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String?retiredLocale=it) \| [SequelasticModelType](#sequelasticmodeltype))[]                                                                                 | object to eventually specify models to include in index |

</br>

### SequelasticSyncOptions

_object_

|   key   |                                                         type                                                         |                                                                   description                                                                    | default |
| :-----: | :------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------: | :-----: |
| refresh | [boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean?retiredLocale=it) | use refresh in [elasticSearch bulk](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#_bulk) method |  false  |

</br>

### SequelasticSearchOptions

|      key      |                                                             type                                                             |                                                    description                                                    | default |
| :-----------: | :--------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------: | :-----: |
|     fuzzy     |     [boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean?retiredLocale=it)     |  use [fuzzy search](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-fuzzy-query.html)   |  false  |
|   fuzziness   | "AUTO" \| [number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number?retiredLocale=it) | search [fuzziness](https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#fuzziness) | "AUTO"  |
| wholeResponse |                                                           boolean                                                            |                             get as return the whole search response or only the hits                              |  false  |

</br>

---
