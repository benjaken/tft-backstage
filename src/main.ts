import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    logger.log('正在启动应用...');

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    logger.log('应用模块已创建');

    // 启用全局验证管道
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    logger.log('验证管道已配置');

    const config = new DocumentBuilder()
      .setTitle('API 文档')
      .setDescription('API 接口文档')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    logger.log('Swagger 文档已配置');

    await app.listen(3000);
    logger.log('应用已启动，监听端口: 3000');
    logger.log('Swagger 文档: http://localhost:3000/api');
  } catch (error) {
    logger.error('应用启动失败:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  logger.error('启动过程中发生未处理的错误:', error);
  process.exit(1);
});
