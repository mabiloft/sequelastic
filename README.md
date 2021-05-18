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
