import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Observation } from '../observations/entities/observation.entity';
import { ObservationsModule } from '../observations/observations.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Observation, Employee]), ObservationsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
