import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from 'src/Security/Guards/authentication.guard';
import { RolesGuard } from 'src/Security/Guards/authorization.guard';
import { ProductDto, UpdateProductDto } from './product.dto';
import type { IHUser } from 'src/models/user.model';
import { ProductService } from './product.service';
import { User } from 'src/common/decorators/user.decorator';
import { RoleEnum } from 'src/common/enums/user.enum';
import { Roles } from 'src/common/decorators/roles.decorators';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/common/multer/multer.config';

@Controller('product')
export class ProductControllers {
  constructor(private productService: ProductService) {}

  @Post('create-product')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', 5, multerOptions({ fileSize: 5 })),
  )
  async createProduct(
    @Body() body: ProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @User() user: IHUser,
  ) {
    return this.productService.createProduct(body, user, files);
  }

  @Get('get-product-by-id/:id')
  @UseGuards(AuthGuard)
  async getProductById(@Param('id') productId: string) {
    return this.productService.getProductById(productId);
  }

  @Get('get-all-product')
  @UseGuards(AuthGuard)
  async getAllProducts(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.productService.getAllProducts(page, limit);
  }

  @Patch('update-product/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', 5, multerOptions({ fileSize: 5 })),
  )
  async updateProduct(
    @Body() body: UpdateProductDto,
    @Param('id') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @User() user: IHUser,
  ) {
    return this.productService.updateProduct(body, productId, user, files);
  }

  @Delete('delete-product/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async deleteProduct(@Param('id') productId: string, @User() user: IHUser) {
    return this.productService.deleteProduct(productId, user);
  }
}
