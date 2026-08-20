import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorators';
import { User } from 'src/common/decorators/user.decorator';
import { RoleEnum } from 'src/common/enums/user.enum';
import type { IHUser } from 'src/models/user.model';
import { AuthGuard } from 'src/Security/Guards/authentication.guard';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { CategoryService } from './category.service';
import { RolesGuard } from 'src/Security/Guards/authorization.guard';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}
  @Post('create-category')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async createCategory(@Body() body: CreateCategoryDto, @User() user: IHUser) {
    return this.categoryService.createCategory(body, user);
  }
  @Get('get-category-by-id/:id')
  async getCategoryById(@Param('id') categoryId: string) {
    return this.categoryService.getCategoryById(categoryId);
  }
  @Get('get-all-category')
  async getAllCategories(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.categoryService.getAllCategories(page, limit);
  }
  @Patch('update-category/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async updateCategory(
    @Body() body: UpdateCategoryDto,
    @Param('id') categoryId: string,
    @User() user: IHUser,
  ) {
    return this.categoryService.updateCategory(body, categoryId, user);
  }
  @Delete('delete-category/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async deleteCategory(@Param('id') categoryId: string, @User() user: IHUser) {
    return this.categoryService.deleteCategory(categoryId, user);
  }
}
