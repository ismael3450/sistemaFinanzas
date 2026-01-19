const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

async function generateOpenAPI() {
  // Dynamic import of AppModule
  const { AppModule } = await import('../dist/app.module.js');
  
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Financial Control API')
    .setDescription('Sistema de Control Financiero Multiorganización - API REST')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Write JSON
  writeFileSync(
    resolve(__dirname, '../openapi.json'),
    JSON.stringify(document, null, 2),
  );
  
  // Write YAML
  const yaml = require('yaml');
  writeFileSync(
    resolve(__dirname, '../openapi.yaml'),
    yaml.stringify(document),
  );

  console.log('✅ OpenAPI specification generated:');
  console.log('   - openapi.json');
  console.log('   - openapi.yaml');

  await app.close();
  process.exit(0);
}

generateOpenAPI().catch((error) => {
  console.error('Failed to generate OpenAPI:', error);
  process.exit(1);
});
