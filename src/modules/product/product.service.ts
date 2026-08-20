import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductDto, UpdateProductDto } from './product.dto';
import { ProductRepo } from 'src/Rebo/product.repo';
import { CategoryService } from '../category/category.service';
import { S3BucketServices } from 'src/common/Services/s3Bucket.service';
import { storageApproachEnum } from 'src/common/enums/multer.enum';
import { ProductDocument } from 'src/models/product.model';

@Injectable()
export class ProductService {
  constructor(
    private productRepo: ProductRepo,
    private categoryService: CategoryService,
    private s3Service: S3BucketServices,
    private configService: ConfigService,
  ) {}

  async createProduct(
    body: ProductDto,
    files: Express.Multer.File[] = [],
  ) {
    await this.categoryService.validateActiveCategory(body.category);

    const uploadedImages = await this.uploadProductImages(files);
    const images = [...(body.images ?? []), ...uploadedImages];

    const product = (await this.productRepo.create({
      data: {
        ...body,
        images,
      },
    })) as ProductDocument;

    return product;
  }

  async getProductById(productId: string) {
    const product = await this.productRepo.findOne({
      filter: { _id: productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException("product doesn't exist");
    }
    return product;
  }

  async getAllProducts(page = 1, limit = 10) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;

    const products = await this.productRepo.findAll({
      filter: { isActive: true },
      options: {
        skip: (safePage - 1) * safeLimit,
        limit: safeLimit,
      },
    });
    return products;
  }

  async updateProduct(
    body: UpdateProductDto,
    productId: string,
    files: Express.Multer.File[] = [],
  ) {
    const product = await this.productRepo.findOne({
      filter: { _id: productId },
    });
    if (!product) {
      throw new NotFoundException("product doesn't exist");
    }

    if (body.category) {
      await this.categoryService.validateActiveCategory(body.category);
    }

    const uploadedImages = await this.uploadProductImages(files);
    const update: UpdateProductDto = { ...body };

    if (uploadedImages.length) {
      update.images = [
        ...(body.images ?? product.images ?? []),
        ...uploadedImages,
      ];
    }

    const updatedProduct = await this.productRepo.findOneAndUpdate({
      filter: { _id: productId },
      update,
      options: { new: true },
    });
    return updatedProduct;
  }

  async deleteProduct(productId: string) {
    const product = await this.productRepo.findOne({
      filter: { _id: productId },
    });
    if (!product) {
      throw new NotFoundException("product doesn't exist");
    }

    return this.productRepo.findOneAndUpdate({
      filter: { _id: productId },
      update: { isActive: false }, // soft delete by setting isActive to false
      options: { new: true },
    });
  }

  private async uploadProductImages(
    files: Express.Multer.File[],
  ): Promise<string[]> {
    if (!files?.length) {
      return [];
    }

    const bucket = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    const region = this.configService.getOrThrow<string>('Region');

    const keys = await Promise.all(
      files.map((file) =>
        this.s3Service.uploadLargeFile({
          file,
          path: 'products',
          storageApproach: storageApproachEnum.MEMORY,
        }),
      ),
    );

    return keys.map(
      (key) => `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    );
  }
}
