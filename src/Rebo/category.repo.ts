import { Injectable } from '@nestjs/common';
import { DbRepo } from './db.repo';
import { Category } from 'src/models/category.model';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CategoryRepo extends DbRepo<Category> {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
  ) {
    super(categoryModel);
  }
}
