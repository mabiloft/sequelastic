# Sequelastic

## The first sequelize-typescript and ElasticSearch bridge tool

+ [installation](#installation)
+ [usage](#usage)

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
## Constructor Properties

name | type | description | default |
-----|------|------------ | ------- |
node | [string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String?retiredLocale=it) | elasticsearch service endpoint | http://localhost:9200
models | ([Model](https://sequelize.org/master/class/lib/model.js~Model.html) \| [SequelasticModelType](#sequelasticmodeltype))[] | list of all the models to index | []
exclude *(optional)* | string[] | list of the model's fields to globally exclude from index | *undefined*

## Sequelastic Types

### SequelasticModelType

*object*

name | type | description |
-----|------|-------------|
model | [Model](https://sequelize.org/master/class/lib/model.js~Model.html) | sequelize model to be indexed 
attributes | string[] \| {exclude: string[]} | 