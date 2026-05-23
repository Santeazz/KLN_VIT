import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { ChecklistCriterion } from '../templates/entities/checklist-criterion.entity';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { ObservationResult } from './entities/observation-result.entity';
import { ObservationSignature } from './entities/observation-signature.entity';
import { Observation } from './entities/observation.entity';
import { ObservationDigestService } from './observation-digest.service';
import { ObservationsController } from './observations.controller';
import { ObservationsService } from './observations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Observation,
      ObservationResult,
      ObservationSignature,
      ChecklistCriterion,
    ]),
    EmployeesModule,
    TemplatesModule,
    UsersModule,
  ],
  controllers: [ObservationsController],
  providers: [ObservationsService, ObservationDigestService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
