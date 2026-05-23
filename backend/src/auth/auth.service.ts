import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByPersonnelNumberWithPassword(dto.tabNumber);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Пользователь не найден или заблокирован');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Неверный табельный номер или пароль');
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      employeeNumber: user.employeeNumber,
    });

    const { passwordHash: _passwordHash, personnelNumber: _personnelNumber, ...safeUser } = user;
    return { accessToken: token, user: safeUser };
  }
}
