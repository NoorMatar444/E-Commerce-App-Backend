import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { storageApproachEnum } from '../enums/multer.enum';
import { allowedFileFormats } from '../pipe/fileValidation.pipe';

// return a configration object
export function multerOptions({
  allowedFormat = allowedFileFormats.image,
  storageApproach = storageApproachEnum.MEMORY,
  fileSize,
}: {
  allowedFormat?: string[];
  storageApproach?: storageApproachEnum;
  fileSize: number;
}): MulterOptions {
  const storage =
    storageApproach === storageApproachEnum.MEMORY
      ? multer.memoryStorage() // upload files in Ram as file.buffer
      : multer.diskStorage({
          destination(req, file, cb) {
            cb(null, tmpdir());
          },
          filename(req, file, cb) {
            cb(null, `${randomUUID()}-${file.originalname}`);
          },
        }); // upload files in hard disk

  // This function decides whether the uploaded file is accepted.
  const fileFilter: MulterOptions['fileFilter'] = (req, file, callback) => {
    if (!allowedFormat.includes(file.mimetype)) {
      return callback(new BadRequestException('Invalid file type'), false);
    }

    callback(null, true);
  };

  return {
    storage,
    // fileSize has to be inside limits object
    limits: {
      fileSize: fileSize * 1024 * 1024,
    },
    fileFilter,
  };
}
