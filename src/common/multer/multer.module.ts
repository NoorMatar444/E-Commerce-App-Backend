import { Global } from '@nestjs/common';
import { multerOptions } from './multer.config';
import { Module } from '@nestjs/common';
import { storageApproachEnum } from '../enums/multer.enum';
import { allowedFileFormats } from '../pipe/fileValidation.pipe';
import { MulterModule } from '@nestjs/platform-express';

@Global()
@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: () =>
        multerOptions({
          allowedFormat: allowedFileFormats.image,
          storageApproach: storageApproachEnum.MEMORY,
          fileSize: 5,
        }),
    }),
  ],
  exports: [MulterModule],
})
export class CustomMulterModule {}
