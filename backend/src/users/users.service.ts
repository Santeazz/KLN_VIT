import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepository.find({
      order: { lastName: 'ASC', firstName: 'ASC', middleName: 'ASC' },
    });
  }

  findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmployeeNumber(employeeNumber: string) {
    return this.usersRepository.findOne({ where: { employeeNumber } });
  }

  findByPersonnelNumber(personnelNumber: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.personnelNumber')
      .where('user.personnelNumber = :personnelNumber', { personnelNumber })
      .getOne();
  }

  findByPersonnelNumberWithPassword(personnelNumber: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.personnelNumber')
      .addSelect('user.passwordHash')
      .where('user.personnelNumber = :personnelNumber', { personnelNumber })
      .getOne();
  }

  async getRequiredWithPersonnelNumber(id: string) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.personnelNumber')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const employeeNumberExists = await this.findByEmployeeNumber(dto.employeeNumber);
    if (employeeNumberExists) {
      throw new ConflictException('Пользователь с таким номером сотрудника уже существует');
    }

    const personnelNumberExists = await this.findByPersonnelNumber(dto.personnelNumber);
    if (personnelNumberExists) {
      throw new ConflictException('Пользователь с таким табельным номером уже существует');
    }

    const user = this.usersRepository.create({
      employeeNumber: dto.employeeNumber,
      personnelNumber: dto.personnelNumber,
      lastName: dto.lastName,
      firstName: dto.firstName,
      middleName: dto.middleName,
      role: dto.role,
      isActive: dto.isActive ?? true,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    const saved = await this.usersRepository.save(user);
    return this.getRequiredWithPersonnelNumber(saved.id);
  }

  async update(id: string, dto: UpdateUserDto, editorId: string) {
    if (id === editorId) {
      throw new BadRequestException('Редактирование собственной учетной записи недоступно');
    }

    const user = await this.getRequiredWithPersonnelNumber(id);

    if (dto.employeeNumber && dto.employeeNumber !== user.employeeNumber) {
      const employeeNumberExists = await this.findByEmployeeNumber(dto.employeeNumber);
      if (employeeNumberExists && employeeNumberExists.id !== id) {
        throw new ConflictException('Пользователь с таким номером сотрудника уже существует');
      }
    }

    if (dto.personnelNumber && dto.personnelNumber !== user.personnelNumber) {
      const personnelNumberExists = await this.findByPersonnelNumber(dto.personnelNumber);
      if (personnelNumberExists && personnelNumberExists.id !== id) {
        throw new ConflictException('Пользователь с таким табельным номером уже существует');
      }
    }

    Object.assign(user, {
      employeeNumber: dto.employeeNumber ?? user.employeeNumber,
      personnelNumber: dto.personnelNumber ?? user.personnelNumber,
      lastName: dto.lastName ?? user.lastName,
      firstName: dto.firstName ?? user.firstName,
      middleName: dto.middleName ?? user.middleName,
      role: dto.role ?? user.role,
      isActive: dto.isActive ?? user.isActive,
    });

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.usersRepository.save(user);
    return this.getRequiredWithPersonnelNumber(id);
  }

  async ensureSeedUser(seed: {
    employeeNumber: string;
    personnelNumber: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    role: UserRole;
    password: string;
  }) {
    const existing =
      (await this.findByPersonnelNumber(seed.personnelNumber)) ??
      (await this.findByEmployeeNumber(seed.employeeNumber));

    if (existing) {
      Object.assign(existing, {
        employeeNumber: seed.employeeNumber,
        personnelNumber: seed.personnelNumber,
        lastName: seed.lastName,
        firstName: seed.firstName,
        middleName: seed.middleName,
        role: seed.role,
        isActive: true,
      });
      await this.usersRepository.save(existing);
      return this.getRequired(existing.id);
    }

    return this.create({ ...seed });
  }

  async getRequired(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }
}
