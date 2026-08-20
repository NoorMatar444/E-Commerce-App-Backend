import {
  CreateOptions,
  Model,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';
export abstract class DbRepo<T> {
  constructor(private model: Model<T>) {}

  async findOne({
    filter,
    projection,
    options,
    populate,
  }: {
    filter?: QueryFilter<T>;
    projection?: ProjectionType<T>;
    options?: QueryOptions<T>;
    populate?: PopulateOptions | PopulateOptions[];
  }) {
    const query = this.model.findOne(filter, projection, options);

    if (populate) {
      return await query.populate(populate).exec();
    }

    return await query.exec();
  }
  async create({
    data,
    options,
  }: {
    data: any;
    options?: CreateOptions;
  }): Promise<any> {
    const result = await this.model.create(data, options);

    if (Array.isArray(data)) {
      return result;
    }

    return Array.isArray(result) ? result[0] : result;
  }
  async findById({
    id,
    projection,
    options,
  }: {
    id: any;
    projection?: ProjectionType<T> | null | undefined;
    options?: QueryOptions<T> | null;
  }) {
    return await this.model.findById(id, projection, options);
  }
  async findAll({
    filter,
    projection,
    options,
    populate,
  }: {
    filter?: QueryFilter<T>;
    projection?: ProjectionType<T> | null;
    options?: QueryOptions<T>;
    populate?: PopulateOptions | PopulateOptions[];
  }) {
    const query = this.model.find(filter, projection, options);

    if (populate) {
      return await query.populate(populate).exec();
    }

    return await query.exec();
  }
  async deleteOne({ filter }: { filter?: QueryFilter<T> }) {
    return await this.model.deleteOne(filter);
  }
  async updateOne({
    filter,
    update,
  }: {
    filter: QueryFilter<T>;
    update: UpdateQuery<T>;
  }) {
    return await this.model.updateOne(filter, update);
  }
  async findOneAndUpdate({
    filter,
    update,
    options,
  }: {
    filter?: QueryFilter<T>;
    update?: UpdateQuery<T>;
    options?: QueryOptions<T> | null;
  }) {
    return this.model.findOneAndUpdate(filter, update, options);
  }
}
