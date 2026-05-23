import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ObservationResultDto {
  @ApiProperty({
    description: 'Идентификатор критерия шаблона',
    example: '11111111-1111-1111-1111-111111111111',
    format: 'uuid',
  })
  @IsUUID()
  criterionId: string;

  @ApiProperty({
    description: 'Фактически выставленный балл',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({
    description: 'Признак выполнения критерия',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  passed?: boolean;

  @ApiPropertyOptional({
    description: 'Комментарий по конкретному критерию',
    example: 'Замечаний нет',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateObservationDto {
  @ApiProperty({
    description: 'Идентификатор сотрудника, по которому проводится наблюдение',
    example: '22222222-2222-2222-2222-222222222222',
    format: 'uuid',
  })
  @IsUUID()
  employeeId: string;

  @ApiProperty({
    description: 'Идентификатор выбранного шаблона КЛН',
    example: '33333333-3333-3333-3333-333333333333',
    format: 'uuid',
  })
  @IsUUID()
  templateId: string;

  @ApiProperty({
    description: 'Дата наблюдения',
    example: '2026-05-23',
    format: 'date',
  })
  @IsDateString()
  observationDate: string;

  @ApiPropertyOptional({
    description: 'Общий комментарий к наблюдению',
    example: 'Смена прошла без критических замечаний.',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    description: 'Результаты по критериям выбранного шаблона',
    type: () => [ObservationResultDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ObservationResultDto)
  @ArrayMinSize(1)
  results: ObservationResultDto[];
}
