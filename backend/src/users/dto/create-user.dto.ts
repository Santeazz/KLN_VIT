import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'Номер сотрудника, отображаемый в интерфейсе и КЛН',
    example: '97',
  })
  @IsString()
  employeeNumber: string;

  @ApiProperty({
    description: 'Табельный номер пользователя',
    example: '100245',
  })
  @IsString()
  personnelNumber: string;

  @ApiProperty({
    description: 'Фамилия пользователя',
    example: 'Иванова',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Имя пользователя',
    example: 'Дарья',
  })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({
    description: 'Отчество пользователя',
    example: 'Сергеевна',
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({
    description: 'Роль пользователя в системе',
    enum: UserRole,
    example: UserRole.OBSERVER,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    description: 'Пароль учетной записи',
    example: 'admin123',
    minLength: 4,
  })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiPropertyOptional({
    description: 'Признак активности учетной записи',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
