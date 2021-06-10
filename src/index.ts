import "colors";
import elasticSearch, { ClientOptions } from "@elastic/elasticsearch";
import pluralize from "pluralize";
import { Model, ModelType } from "sequelize-typescript";

type SequelasticModelType = {
  model: ModelType;
  as?: string;
  attributes?: string[] | { exclude: string[] };
  include?: (string | SequelasticModelType)[];
};

type SequelasticConstructorProps = {
  models: (ModelType | SequelasticModelType)[];
  exclude?: string[];
} & ClientOptions;
type SequelasticSearchOptionsWholeResponse = {
  fuzzy?: boolean;
  fuzziness: "AUTO" | number;
  wholeResponse?: true;
  from?: number;
  size?: number;
};
type SequelasticSearchOptions = {
  fuzzy?: boolean;
  fuzziness?: "AUTO" | number;
  wholeResponse?: false;
  from?: number;
  size?: number;
};

type SequelasticMultipleSearchIndex = {
  index: string;
  options: Omit<SequelasticSearchOptions, "wholeResponse">;
};

type SequelasticMultipleSearchOptions = {
  indices?: (SequelasticMultipleSearchIndex | string)[];
  from?: number;
  size?: number;
  fuzzy?: boolean;
  fuzziness?: "AUTO" | number;
};

type SequelasticSyncOptions = { refresh?: boolean };

function isSequelasticModel(
  inputModel: any
): inputModel is SequelasticModelType {
  return !!(inputModel as SequelasticModelType).model;
}
export default class Sequelastic {
  public elastic: elasticSearch.Client;
  public models: (SequelasticModelType | ModelType)[];
  #fieldsToExclude: string[];
  // constructor(options: SqlasticConstructorProps) {
  constructor(options: SequelasticConstructorProps) {
    const { models, exclude: fieldsToExclude, ...cliOpt } = options;
    this.models = models;
    this.elastic = new elasticSearch.Client({
      node: cliOpt.node || "http://localhost:9200",
      ...cliOpt,
    });
    this.#fieldsToExclude = fieldsToExclude;
  }

  public async sync(options?: SequelasticSyncOptions): Promise<any> {
    const toExclude = this.#fieldsToExclude;
    const allDbPromises: Promise<any>[] = [];
    const allIndiciesCreationPromises: Promise<any>[] = [];
    // try {
    //   await this.elastic.indices.delete({
    //     index: "_all",
    //   });
    // } catch (err) {
    //   throw new Error(err);
    // }
    const allIndices = await this.allIndices();
    this.models.forEach((model: SequelasticModelType) => {
      allIndiciesCreationPromises.push(
        new Promise((res, rej) => {
          // console.log("Model", model.rawAttributes);
          try {
            if (isSequelasticModel(model)) {
              const newIndexName = pluralize.plural(
                model.model.name.toLocaleLowerCase()
              );
              if (!allIndices.includes(newIndexName)) {
                this.elastic.indices.create({
                  index: newIndexName,
                  body: {
                    mappings: {
                      properties: parseSqlAttributesToElastic(
                        (model.model as any as typeof Model).rawAttributes
                      ),
                    },
                  },
                });
              }
            } else {
              const newIndexName = pluralize.plural(
                (model as ModelType).name.toLowerCase()
              );
              if (!allIndices.includes(newIndexName)) {
                this.elastic.indices.create({
                  index: newIndexName,
                  body: {
                    mappings: {
                      properties: parseSqlAttributesToElastic(
                        (model as typeof Model).rawAttributes
                      ),
                    },
                  },
                });
              }
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
          const attributesObject = model.attributes
            ? model.attributes
            : { exclude: toExclude };

          const findAllObj = {
            attributes: attributesObject,
            as: model.as,
            include: model.include ? model.include : [],
          };
          try {
            if (!!model.model) {
              res(
                model.model
                  .unscoped()
                  .findAll(findAllObj)
                  .map((x: any) => {
                    // console.log("PROMISE", x.toJSON());

                    return [
                      {
                        index: {
                          _id: x.id,
                          _index: pluralize.plural(
                            model.model.name.toLowerCase()
                          ),
                        },
                      },
                      { ...x?.toJSON() },
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
                          _id: x.id,
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
      // return indices;
      for (const index of indices) {
        // console.log(index.documents[0]);
        const docs = index.documents.flat();
        this.elastic
          .bulk({ body: docs, refresh: options?.refresh })
          .catch((err) => {
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

  public async search(
    query: string,
    index: "_all" | "*" | string,
    options?: SequelasticSearchOptions
  ): Promise<[{ [key: string]: any }]>;

  public async search(
    query: string,
    index: "_all" | "*" | string,
    options?: SequelasticSearchOptionsWholeResponse
  ): Promise<
    elasticSearch.ApiResponse<Record<string, any>, Record<string, unknown>>
  >;

  public async search(
    query: string,
    index: "_all" | "*" | string = "*",
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
          from: options?.from ? options.from : 0,
          size: options?.size ? options.size : 10,
          query: {
            query_string: {
              query: options?.fuzzy ? `${query}~` : query,
              default_field: index,
              fuzziness: options?.fuzziness,
            },
          },
        },
      });

      if (options.wholeResponse) return result as any;
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
      return result as any;
    } catch (err) {
      this.handleErrors(err);
    }
  }

  public async searchInIndices(
    query: string,
    options?: SequelasticMultipleSearchOptions
  ) {
    const existingIndices: string[] = (
      await this.elastic.cat.indices({ format: "json" })
    ).body.map((x: any) => x.index);

    const validIndices = options?.indices
      ? options?.indices.filter((index) => {
          if (typeof index === "string") {
            return existingIndices.findIndex((x) => x === index) !== -1;
          } else {
            return existingIndices.findIndex((x) => x === index.index) !== -1;
          }
        })
      : existingIndices;

    const payload: any[] = [];

    validIndices.forEach((index) => {
      const indexName = typeof index === "string" ? index : index.index;
      const from =
        typeof index === "string" ? options?.from : index.options?.from;
      const size =
        typeof index === "string" ? options?.size : index.options?.size;
      const fuzzy =
        typeof index === "string" ? options?.fuzzy : index.options?.fuzzy;
      const fuzziness =
        typeof index === "string"
          ? options?.fuzziness
          : index.options?.fuzziness;

      payload.push(
        { index: indexName },
        {
          from,
          size,
          query: {
            query_string: { query: fuzzy ? `${query}~` : query, fuzziness },
          },
        }
      );
    });
    try {
      return await this.elastic.msearch({ body: payload });
    } catch (err) {
      this.handleErrors(err);
    }
  }

  public async allIndices(): Promise<string[]> {
    const allIndices = await (
      await this.elastic.cat.indices({ format: "json" })
    ).body.map((x: any) => x.index);

    return allIndices;
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
