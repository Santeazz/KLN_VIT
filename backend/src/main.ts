import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL');
  const port = config.get<number>('APP_PORT') ?? 3000;

  app.setGlobalPrefix('api');
  app.enableCors({ origin: frontendUrl ? frontendUrl.split(',') : true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('КЛН API')
    .setDescription(
      'Документация API веб-приложения для ведения контрольных листов наблюдения и формирования отчета по премированию.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Введите JWT-токен, полученный через /auth/login',
      },
      'bearer',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    customSiteTitle: 'КЛН API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`Backend API: http://localhost:${port}/api`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`Frontend URL: ${frontendUrl ?? 'http://localhost:5173'}`);
}

bootstrap();
