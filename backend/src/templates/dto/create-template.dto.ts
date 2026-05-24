import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateCriterionDto {
  @ApiProperty({
    description: 'Порядок отображения критерия в шаблоне',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  sortOrder: number;

  @ApiProperty({
    description: 'Краткое наименование критерия',
    example: 'Соблюдение стандартов обслуживания',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Подробное описание критерия',
    example: 'Сотрудник приветствует гостя и соблюдает стандарт общения.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Максимальный балл по критерию',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  maxScore: number;
}

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Наименование шаблона КЛН',
    example: 'КЛН для кассовой зоны',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Рабочая зона или позиция, к которой относится шаблон',
    example: 'Кассовая зона',
  })
  @IsString()
  position: string;

  @ApiPropertyOptional({
    description: 'Признак активности шаблона',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Список критериев шаблона',
    type: () => [CreateCriterionDto],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateCriterionDto)
  @ArrayMinSize(1)
  criteria: CreateCriterionDto[];
}
