import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ObservationStatus } from '../entities/observation.entity';

export class ListObservationsDto {
  @ApiPropertyOptional({
    description: 'Отчетный месяц в формате YYYY-MM',
    example: '2026-05',
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({
    description: 'Идентификатор сотрудника для фильтрации списка КЛН',
    example: '22222222-2222-2222-2222-222222222222',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Статус КЛН для фильтрации',
    enum: ObservationStatus,
    example: ObservationStatus.SIGNED,
  })
  @IsOptional()
  @IsEnum(ObservationStatus)
  status?: ObservationStatus;
}
