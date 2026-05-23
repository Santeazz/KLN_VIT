import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, ValidateIf } from 'class-validator';
import { SignatureRole } from '../entities/observation-signature.entity';

export class SignObservationDto {
  @ApiProperty({
    description: 'Роль подписанта',
    enum: SignatureRole,
    example: SignatureRole.OBSERVER,
  })
  @IsEnum(SignatureRole)
  signerRole: SignatureRole;

  @ApiPropertyOptional({
    description: 'Табельный номер сотрудника, обязателен при подписи сотрудником',
    example: '100245',
  })
  @ValidateIf((dto: SignObservationDto) => dto.signerRole === SignatureRole.EMPLOYEE)
  @IsString()
  employeeTabNumber?: string;
}
