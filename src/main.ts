import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // rawBody keeps the original bytes so Stripe can verify webhook signatures
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const PORT = process.env.PORT || 3000;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(PORT, () => {
    console.log(`connect on port ${PORT}`);
  });
}
void bootstrap();
