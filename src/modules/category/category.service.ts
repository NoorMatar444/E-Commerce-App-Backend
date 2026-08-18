import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { IHUser } from 'src/models/user.model';
import { UserRepo } from 'src/Rebo/user.repo';
import { CategoryRepo } from 'src/Rebo/category.repo';
import { ProductRepo } from 'src/Rebo/product.repo';
import { Category, CategoryDocument } from 'src/models/category.model';

@Injectable()
export class CategoryService {
  constructor(
    private userRepo: UserRepo,
    private categoryRepo: CategoryRepo,
    private productRepo: ProductRepo,
  ) {}

  async createCategory(
    body: CreateCategoryDto,
    user: IHUser,
  ): Promise<CategoryDocument> {
    await this.ensureUserExists(user._id);

    try {
      return (await this.categoryRepo.create({
        data: {
          ...body,
        },
      })) as CategoryDocument;
    } catch (error: unknown) {
      this.handleDuplicateKeyError(error);
    }
  }

  async getCategoryById(categoryId: string) {
    this.assertValidObjectId(categoryId, 'category id');
    const category = await this.categoryRepo.findOne({
      filter: { _id: categoryId },
    });
    if (!category) {
      throw new NotFoundException("category doesn't exist");
    }
    return category;
  }

  async getAllCategories(page: number, limit: number) {
    const categories = await this.categoryRepo.findAll({
      filter: {},
      options: {
        skip: (page - 1) * limit,
        limit,
      },
    });
    return categories;
  }

  async updateCategory(
    body: UpdateCategoryDto,
    categoryId: string,
    user: IHUser,
  ) {
    await this.ensureUserExists(user._id);
    this.assertValidObjectId(categoryId, 'category id');

    try {
      const updatedCategory = await this.categoryRepo.findOneAndUpdate({
        filter: { _id: categoryId },
        update: {
          ...body,
        },
        options: { new: true },
      });
      if (!updatedCategory) {
        throw new NotFoundException('category does not exist');
      }
      return updatedCategory;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handleDuplicateKeyError(error);
    }
  }

  async deleteCategory(categoryId: string, user: IHUser) {
    await this.ensureUserExists(user._id);
    this.assertValidObjectId(categoryId, 'category id');

    const category = await this.categoryRepo.findOne({
      filter: { _id: categoryId },
    });
    if (!category) {
      throw new NotFoundException("category doesn't exist");
    }

    const linkedProduct = await this.productRepo.findOne({
      filter: { category: categoryId },
    });
    if (linkedProduct) {
      throw new BadRequestException(
        'Cannot delete category with existing products',
      );
    }

    await this.categoryRepo.deleteOne({ filter: { _id: categoryId } });
  }

  async validateCategoryExists(categoryId: string): Promise<Category> {
    this.assertValidObjectId(categoryId, 'category id');
    const category = await this.categoryRepo.findOne({
      filter: { _id: categoryId },
    });
    if (!category) {
      throw new NotFoundException("category doesn't exist");
    }
    return category;
  }

  async validateActiveCategory(categoryId: string): Promise<Category> {
    const category = await this.validateCategoryExists(categoryId);
    if (!category.isActive) {
      throw new BadRequestException('Category is inactive');
    }
    return category;
  }

  private async ensureUserExists(userId: Types.ObjectId) {
    const userExist = await this.userRepo.findOne({
      filter: {
        _id: userId,
      },
    });
    if (!userExist) {
      throw new NotFoundException('user not exist');
    }
  }

  private assertValidObjectId(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private handleDuplicateKeyError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new ConflictException('Category name already exists');
    }
    throw error;
  }
}
