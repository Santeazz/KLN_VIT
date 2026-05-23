import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { ObservationsModule } from './observations/observations.module';
import { ReportsModule } from './reports/reports.module';
import { SeedModule } from './seed/seed.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST') ?? 'localhost',
        port: Number(config.get<string>('DB_PORT') ?? 5432),
        username: config.get<string>('DB_USER') ?? 'postgres',
        password: config.get<string>('DB_PASSWORD') ?? 'postgres',
        database: config.get<string>('DB_NAME') ?? 'kln_vit',
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNC') !== 'false',
      }),
    }),
    UsersModule,
    AuthModule,
    EmployeesModule,
    TemplatesModule,
    ObservationsModule,
    ReportsModule,
    SeedModule,
  ],
})
export class AppModule {}
