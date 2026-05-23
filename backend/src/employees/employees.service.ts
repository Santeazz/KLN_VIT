import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  findAll() {
    return this.employeesRepository.find({
      order: { lastName: 'ASC', firstName: 'ASC', middleName: 'ASC' },
    });
  }

  async getRequired(id: string) {
    const employee = await this.employeesRepository.findOne({ where: { id } });
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    return employee;
  }

  async getRequiredWithPersonnelNumber(id: string) {
    const employee = await this.employeesRepository
      .createQueryBuilder('employee')
      .addSelect('employee.personnelNumber')
      .where('employee.id = :id', { id })
      .getOne();

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден');
    }

    return employee;
  }

  private findByEmployeeNumber(employeeNumber: string) {
    return this.employeesRepository.findOne({ where: { employeeNumber } });
  }

  private findByPersonnelNumber(personnelNumber: string) {
    return this.employeesRepository
      .createQueryBuilder('employee')
      .addSelect('employee.personnelNumber')
      .where('employee.personnelNumber = :personnelNumber', { personnelNumber })
      .getOne();
  }

  async create(dto: CreateEmployeeDto) {
    const employeeNumberExists = await this.findByEmployeeNumber(dto.employeeNumber);
    if (employeeNumberExists) {
      throw new ConflictException('Сотрудник с таким номером сотрудника уже существует');
    }

    const personnelNumberExists = await this.findByPersonnelNumber(dto.personnelNumber);
    if (personnelNumberExists) {
      throw new ConflictException('Сотрудник с таким табельным номером уже существует');
    }

    const saved = await this.employeesRepository.save(
      this.employeesRepository.create({ ...dto, isActive: dto.isActive ?? true }),
    );
    return this.getRequiredWithPersonnelNumber(saved.id);
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.getRequiredWithPersonnelNumber(id);

    if (dto.employeeNumber && dto.employeeNumber !== employee.employeeNumber) {
      const employeeNumberExists = await this.findByEmployeeNumber(dto.employeeNumber);
      if (employeeNumberExists && employeeNumberExists.id !== id) {
        throw new ConflictException('Сотрудник с таким номером сотрудника уже существует');
      }
    }

    if (dto.personnelNumber && dto.personnelNumber !== employee.personnelNumber) {
      const personnelNumberExists = await this.findByPersonnelNumber(dto.personnelNumber);
      if (personnelNumberExists && personnelNumberExists.id !== id) {
        throw new ConflictException('Сотрудник с таким табельным номером уже существует');
      }
    }

    Object.assign(employee, dto);
    await this.employeesRepository.save(employee);
    return this.getRequiredWithPersonnelNumber(id);
  }

  async ensureSeedEmployee(dto: CreateEmployeeDto) {
    const existing =
      (await this.findByPersonnelNumber(dto.personnelNumber)) ??
      (await this.findByEmployeeNumber(dto.employeeNumber));

    if (existing) {
      Object.assign(existing, {
        employeeNumber: dto.employeeNumber,
        personnelNumber: dto.personnelNumber,
        lastName: dto.lastName,
        firstName: dto.firstName,
        middleName: dto.middleName,
        position: dto.position,
        department: dto.department,
        hireDate: dto.hireDate,
        isActive: dto.isActive ?? true,
      });
      await this.employeesRepository.save(existing);
      return this.getRequired(existing.id);
    }

    return this.create(dto);
  }
}
