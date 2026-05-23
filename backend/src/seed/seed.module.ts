import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [UsersModule, EmployeesModule, TemplatesModule],
  providers: [SeedService],
})
export class SeedModule {}
