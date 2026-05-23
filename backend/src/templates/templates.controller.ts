import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Templates')
@ApiBearerAuth('bearer')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER, UserRole.HR)
  @ApiOperation({ summary: 'Получение списка шаблонов КЛН' })
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OBSERVER, UserRole.HR)
  @ApiOperation({ summary: 'Получение шаблона КЛН по идентификатору' })
  @ApiParam({ name: 'id', description: 'Идентификатор шаблона' })
  findOne(@Param('id') id: string) {
    return this.templatesService.getRequired(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создание шаблона КЛН' })
  create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновление шаблона КЛН' })
  @ApiParam({ name: 'id', description: 'Идентификатор шаблона' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }
}
