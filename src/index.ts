// require("dotenv-flow").config();
import elasticSearch, { ClientOptions } from "@elastic/elasticsearch";
import pluralize from "pluralize";
import { Model } from "sequelize-typescript";
import "colors";
type SequelasticConstructorProps = { models: typeof Model[] } & ClientOptions;

export default class Sequelastic {
  public elastic: elasticSearch.Client;
  public models: typeof Model[];

  // constructor(options: SqlasticConstructorProps) {
  constructor(options: SequelasticConstructorProps) {
    const { models, ...cliOpt } = options;
    this.models = models;
    this.elastic = new elasticSearch.Client({
      node: "http://localhost.mabiloft.com:9200",
      ...cliOpt,
    });
  }

  public async sync(): Promise<any> {
    const allDbPromises: Promise<any>[] = [];
    const allIndiciesCreationPromises: Promise<any>[] = [];
    try {
      await this.elastic.indices.delete({
        index: "_all",
      });
    } catch (err) {
      throw new Error(err);
    }

    this.models.forEach((model: typeof Model) => {
      allIndiciesCreationPromises.push(
        new Promise((res, rej) => {
          // console.log("Model", model.rawAttributes);
          try {
            this.elastic.indices.create({
              index: pluralize.plural(model.name.toLowerCase()),
              body: {
                mappings: {
                  properties: parseSqlAttributesToElastic(model.rawAttributes),
                },
              },
            });
          } catch (err) {
            throw new Error(err);
          }
        })
      );
    });

    this.models.forEach((model: any) => {
      allDbPromises.push(
        new Promise(function (res, rej) {
          try {
            res(
              model
                .unscoped()
                .findAll()
                .map((x: any) => {
                  // console.log("PROMISE", x.toJSON());

                  return [
                    {
                      index: {
                        _index: pluralize.plural(model.name.toLowerCase()),
                      },
                    },
                    x?.toJSON(),
                  ];
                })
            );
          } catch (err) {
            rej(err);
          }
        })
      );
    });

    try {
      const allDocuments = await Promise.all(allDbPromises);
      // console.log("~ allDocuments", allDocuments);
      const indices = this.models.map((x, i) => {
        return { name: pluralize.plural(x.name), documents: allDocuments[i] };
      });
      // return indices;
      for (const index of indices) {
        // console.log(index.documents[0]);
        const docs = index.documents.flat();
        // console.log("🚀 ~ file: index.ts ~ line 80 ~ Sqlastic ~ sync ~ docs", docs);
        this.elastic.bulk({ body: docs }).catch((err) => {
          console.log("BULK ERR".red, err);
        });
      }
      // this.elastic.updateByQuery({});
    } catch (err) {
      console.error(err);
      return false;
    }
    return true;
  }
}

const elasticClient = new elasticSearch.Client({
  node: process.env.SEARCH_SERVICE_URL || "http://localhost.mabiloft.com:9200",
  maxRetries: 5,
  requestTimeout: 60000,
  sniffOnStart: true,
});

export async function checkIndex(indexName: string) {
  const index = await elasticClient.indices.exists({ index: indexName });
  return !!index;
}

// type SqlType = "INTEGER" | "STRING" | "DATE" | "VIRTUAL" | "TEXT" | "JSON";
// type SqlAttributesType = {
//   [key: string]: {
//     type: SqlType;
//     field: string;
//   };
// };
function parseSqlAttributesToElastic(rawAttributes: any) {
  const newProps: any = {};

  Object.keys(rawAttributes).forEach((key) => {
    const type = rawAttributes[key].type.constructor.name.toLocaleLowerCase();
    if (!(type === "jsontype" || type === "virtual")) {
      // console.log(type);
      newProps[key] = { type: sqlToTypescriptTypeTranslator(type) };
    }
  });
  // console.log(newProps);

  return newProps;
}

function sqlToTypescriptTypeTranslator(type: any) {
  if (type === "string") {
    return "text";
  }
  return type;
}
