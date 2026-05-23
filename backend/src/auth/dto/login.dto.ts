import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Табельный номер пользователя, используемый для входа в систему',
    example: '100245',
  })
  @IsString()
  tabNumber: string;

  @ApiProperty({
    description: 'Пароль учетной записи',
    example: 'admin123',
    minLength: 4,
  })
  @IsString()
  @MinLength(4)
  password: string;
}
