import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Номер сотрудника, отображаемый в интерфейсе и КЛН',
    example: '97',
  })
  @IsString()
  employeeNumber: string;

  @ApiProperty({
    description: 'Табельный номер сотрудника',
    example: '100245',
  })
  @IsString()
  personnelNumber: string;

  @ApiProperty({
    description: 'Фамилия сотрудника',
    example: 'Иванова',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Имя сотрудника',
    example: 'Дарья',
  })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({
    description: 'Отчество сотрудника',
    example: 'Сергеевна',
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({
    description: 'Должность сотрудника',
    example: 'Работник ПБО',
  })
  @IsString()
  position: string;

  @ApiPropertyOptional({
    description: 'Подразделение сотрудника',
    example: 'Зал',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Дата приема на работу',
    example: '2026-05-15',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({
    description: 'Признак активности карточки сотрудника',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
