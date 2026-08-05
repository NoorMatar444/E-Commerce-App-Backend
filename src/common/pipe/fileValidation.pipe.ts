import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

// List of allowed file MIME types
export const allowedFileFormats = {
  video: ['video/mp4', 'video/avi', 'video/mov'],
  image: ['image/jpeg', 'image/png', 'image/gif'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  pdf: ['application/pdf'],
};

// Describe uploaded file structure from Multer
export interface UploadFileShape {
  mimetype: string; // File type like image/png
  originalname?: string; // Original file name
  size?: number; // File size in bytes
  buffer?: Buffer; // File data in memory
}

@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  // Receive allowed MIME types
  constructor(private allowedFormat: string[]) {}

  // Runs before controller method
  transform(value: UploadFileShape, metadata: ArgumentMetadata) {
    console.log(metadata);

    // Check if uploaded file type is allowed
    if (!this.allowedFormat.includes(value.mimetype)) {
      // Reject invalid files
      throw new BadRequestException('invalid file type');
    }

    // Return valid file to controller
    return value;
  }
}
