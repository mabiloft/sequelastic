import "colors";
import elasticSearch, { ClientOptions } from "@elastic/elasticsearch";
import pluralize from "pluralize";
import { Model } from "sequelize-typescript";

type SequelasticModelType = {
  model: typeof Model;
  attributes?: string[] | { exclude: string[] };
};
type SequelasticConstructorProps = {
  models: (typeof Model | SequelasticModelType)[];
  exclude?: string[];
} & ClientOptions;
type SequelasticSearchOptionsWholeResponse = {
  fuzzy?: boolean;
  fuzziness: "AUTO" | number;
  wholeResponse?: true;
};
type SequelasticSearchOptions = {
  fuzzy?: boolean;
  fuzziness: "AUTO" | number;
  wholeResponse?: false;
};

function isSequelasticModel(
  inputModel: any
): inputModel is SequelasticModelType {
  return !!(inputModel as SequelasticModelType).model;
}
export default class Sequelastic {
  public elastic: elasticSearch.Client;
  public models: (SequelasticModelType | typeof Model)[];
  #fieldsToExclude: string[];
  // constructor(options: SqlasticConstructorProps) {
  constructor(options: SequelasticConstructorProps) {
    const { models, exclude: fieldsToExclude, ...cliOpt } = options;
    this.models = models;
    this.elastic = new elasticSearch.Client({
      node: "http://localhost.mabiloft.com:9200",
      ...cliOpt,
    });
    this.#fieldsToExclude = fieldsToExclude;
  }

  public async sync(): Promise<any> {
    const toExclude = this.#fieldsToExclude;

    const allDbPromises: Promise<any>[] = [];
    const allIndiciesCreationPromises: Promise<any>[] = [];
    try {
      await this.elastic.indices.delete({
        index: "_all",
      });
    } catch (err) {
      throw new Error(err);
    }

    this.models.forEach((model: SequelasticModelType) => {
      allIndiciesCreationPromises.push(
        new Promise((res, rej) => {
          // console.log("Model", model.rawAttributes);
          try {
            if (isSequelasticModel(model)) {
              this.elastic.indices.create({
                index: pluralize.plural(model.model.name.toLocaleLowerCase()),
                body: {
                  mappings: {
                    properties: parseSqlAttributesToElastic(
                      model.model.rawAttributes
                    ),
                  },
                },
              });
            } else {
              this.elastic.indices.create({
                index: pluralize.plural(
                  (model as typeof Model).name.toLowerCase()
                ),
                body: {
                  mappings: {
                    properties: parseSqlAttributesToElastic(
                      (model as typeof Model).rawAttributes
                    ),
                  },
                },
              });
            }
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
            if (!!model.model) {
              res(
                model.model
                  .unscoped()
                  .findAll({
                    attributes: model.attributes
                      ? model.attributes
                      : { exclude: toExclude },
                  })
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
            } else {
              res(
                model
                  .unscoped()
                  .findAll({ attributes: { exclude: toExclude } })
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
            }
          } catch (err) {
            rej(err);
          }
        })
      );
    });

    try {
      const allDocuments = await Promise.all(allDbPromises);
      const indices = this.models.map((x, i) => {
        if (isSequelasticModel(x)) {
          return {
            name: pluralize.plural(x.model.name),
            documents: allDocuments[i],
          };
        } else {
          return { name: pluralize.plural(x.name), documents: allDocuments[i] };
        }
      });
      for (const index of indices) {
        const docs = index.documents.flat();
        this.elastic.bulk({ body: docs, refresh: true }).catch((err) => {
          console.log("BULK ERR".red, err);
        });
      }
    } catch (err) {
      console.error(err);
      return false;
    }
    return true;
  }

  public async search(
    index: "_all" | "*" | string,
    query: string,
    options?: SequelasticSearchOptions
  ): Promise<[{ [key: string]: any }]>;

  public async search(
    index: "_all" | "*" | string,
    query: string,
    options?: SequelasticSearchOptionsWholeResponse
  ): Promise<
    elasticSearch.ApiResponse<Record<string, any>, Record<string, unknown>>
  >;

  public async search(
    index: "_all" | "*" | string,
    query: string,
    options?: SequelasticSearchOptionsWholeResponse | SequelasticSearchOptions
  ): Promise<
    | [{ [key: string]: any }]
    | elasticSearch.ApiResponse<Record<string, any>, Record<string, unknown>>
  > {
    try {
      if (!query) {
        return [{}];
      }
      const result = await this.elastic.search({
        index: "_all",
        body: {
          aggs: {
            byIndex: {
              terms: {
                field: "_index",
              },
            },
          },
          query: {
            query_string: {
              query: options?.fuzzy ? `${query}~` : query,
              default_field: index,
              fuzziness: options?.fuzziness,
            },
          },
        },
      });

      if (options.wholeResponse) return result;
      return result.body.hits.hits;
    } catch (err) {
      this.handleErrors(err);
    }
  }

  public async customSearch(
    params: elasticSearch.RequestParams.Search
  ): Promise<
    elasticSearch.ApiResponse<Record<string, any>, Record<string, unknown>>
  > {
    try {
      const result = await this.elastic.search(params);
      return result;
    } catch (err) {
      this.handleErrors(err);
    }
  }

  private handleErrors(error: any): never {
    if (error.body?.error) {
      console.log("Sequelastic error:", error.body?.error);

      throw new Error(error.body?.error);
    }
    console.log("Sequelastic error", error);

    throw new Error(error);
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
