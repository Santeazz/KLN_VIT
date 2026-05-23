import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Employees')
@ApiBearerAuth('bearer')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER, UserRole.HR)
  @ApiOperation({ summary: 'Получение списка сотрудников' })
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @ApiOperation({ summary: 'Получение сотрудника по идентификатору' })
  @ApiParam({ name: 'id', description: 'Идентификатор сотрудника' })
  findOne(@Param('id') id: string) {
    return this.employeesService.getRequiredWithPersonnelNumber(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @ApiOperation({ summary: 'Создание карточки сотрудника' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @ApiOperation({ summary: 'Обновление карточки сотрудника' })
  @ApiParam({ name: 'id', description: 'Идентификатор сотрудника' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }
}
