import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { storageApproachEnum } from '../enums/multer.enum';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3BucketServices {
  private client: S3Client;
  private BucketName: string;
  constructor(configService: ConfigService) {
    this.BucketName = configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.client = new S3Client({
      region: configService.getOrThrow<string>('Region'),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('AccessKeyId'),
        secretAccessKey: configService.getOrThrow<string>('SecretAccessKey'),
      },
    });
  }
  async uploadfile({
    file,
    path,
  }: {
    file: Express.Multer.File;
    path: string;
  }) {
    const key = `${file.originalname}-${path}-${randomUUID()}-${file.mimetype}`;
    const command = new PutObjectCommand({
      Bucket: this.BucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    return this.client.send(command);
  }
  async uploadLargeFile({
    file,
    path,
    storageApproach,
  }: {
    file: Express.Multer.File;
    path: string;
    storageApproach: storageApproachEnum;
  }) {
    const key = `${file.originalname}-${path}-${randomUUID()}-${file.mimetype}`;
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.BucketName,
        Key: key,
        Body:
          storageApproach == storageApproachEnum.DISK
            ? createReadStream(file.path)
            : file.buffer,
        ContentType: file.mimetype,
      },
    });
    const uploadedFile = await upload.done();
    return uploadedFile.Key as string;
  }

  async uploadFiles({
    files,
    path,
    storageApproach,
  }: {
    files: Express.Multer.File[];
    path: string;
    storageApproach: storageApproachEnum;
  }) {
    return Promise.all(
      files.map((file) =>
        storageApproach == storageApproachEnum.MEMORY
          ? this.uploadfile({ file, path })
          : this.uploadLargeFile({ file, path, storageApproach }),
      ),
    );
  }

  async getFile(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.BucketName,
      Key: key,
    });
    return this.client.send(command);
  }

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.BucketName,
      Key: key,
    });
    return this.client.send(command);
  }

  async deleteFiles(keys: string[]) {
    const command = new DeleteObjectsCommand({
      Bucket: this.BucketName,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    });
    return this.client.send(command);
  }

  async listFolderKeys(Prefix: string) {
    const command = new ListObjectsCommand({
      Bucket: this.BucketName,
      Prefix,
    });
    return this.client.send(command);
  }
  async createPresignedGetFile({ Key }: { Key: string }) {
    const command = new GetObjectCommand({
      Bucket: this.BucketName,
      Key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: 3600,
    });
  }
  async createPresignedUploadFile({
    path,
    originalName,
    contentType,
  }: {
    path: string;
    originalName: string;
    contentType: string;
  }) {
    const Key = `${path}/${randomUUID()}_${originalName}`;
    const command = new PutObjectCommand({
      Bucket: this.BucketName,
      Key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    return { Key, url };
  }
}
