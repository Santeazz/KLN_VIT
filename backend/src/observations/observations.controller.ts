import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateObservationDto } from './dto/create-observation.dto';
import { ListObservationsDto } from './dto/list-observations.dto';
import { SignObservationDto } from './dto/sign-observation.dto';
import { ObservationsService } from './observations.service';

@Controller('observations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Observations')
@ApiBearerAuth('bearer')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER, UserRole.HR)
  @ApiOperation({ summary: 'Получение журнала КЛН' })
  findAll(@Query() query: ListObservationsDto) {
    return this.observationsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER, UserRole.HR)
  @ApiOperation({ summary: 'Получение КЛН по идентификатору' })
  @ApiParam({ name: 'id', description: 'Идентификатор КЛН' })
  findOne(@Param('id') id: string) {
    return this.observationsService.getRequired(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  @ApiOperation({ summary: 'Создание контрольного листа наблюдения' })
  create(@Body() dto: CreateObservationDto, @CurrentUser() user: User) {
    return this.observationsService.create(dto, user);
  }

  @Post(':id/sign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER)
  @ApiOperation({ summary: 'Подписание контрольного листа наблюдения' })
  @ApiParam({ name: 'id', description: 'Идентификатор КЛН' })
  sign(@Param('id') id: string, @Body() dto: SignObservationDto, @CurrentUser() user: User) {
    return this.observationsService.sign(id, dto, user);
  }

  @Patch(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
  @ApiOperation({ summary: 'Перевод подписанного КЛН в архив' })
  @ApiParam({ name: 'id', description: 'Идентификатор КЛН' })
  archive(@Param('id') id: string) {
    return this.observationsService.archive(id);
  }
}
