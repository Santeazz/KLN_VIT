import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChecklistCriterion } from './entities/checklist-criterion.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ChecklistTemplate } from './entities/checklist-template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(ChecklistTemplate)
    private readonly templatesRepository: Repository<ChecklistTemplate>,
    @InjectRepository(ChecklistCriterion)
    private readonly criteriaRepository: Repository<ChecklistCriterion>,
  ) {}

  findAll() {
    return this.templatesRepository.find({ order: { position: 'ASC', title: 'ASC' } });
  }

  async getRequired(id: string) {
    const template = await this.templatesRepository.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Шаблон контрольного листа не найден');
    template.criteria = [...template.criteria].sort((a, b) => a.sortOrder - b.sortOrder);
    return template;
  }

  create(dto: CreateTemplateDto) {
    const template = this.templatesRepository.create({
      title: dto.title,
      position: dto.position,
      isActive: dto.isActive ?? true,
      criteria: dto.criteria.map((criterion) => ({ ...criterion })),
    });
    return this.templatesRepository.save(template);
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const template = await this.getRequired(id);

    template.title = dto.title ?? template.title;
    template.position = dto.position ?? template.position;
    template.isActive = dto.isActive ?? template.isActive;

    if (dto.criteria) {
      await this.criteriaRepository
        .createQueryBuilder()
        .delete()
        .from(ChecklistCriterion)
        .where('template_id = :templateId', { templateId: id })
        .execute();

      template.criteria = dto.criteria.map((criterion) =>
        this.criteriaRepository.create({
          sortOrder: criterion.sortOrder,
          title: criterion.title,
          description: criterion.description,
          maxScore: criterion.maxScore,
        }),
      );
    }

    const saved = await this.templatesRepository.save(template);
    return this.getRequired(saved.id);
  }

  async ensureSeedTemplate(dto: CreateTemplateDto) {
    const existing = await this.templatesRepository.findOne({
      where: { title: dto.title, position: dto.position },
    });
    if (existing) return this.update(existing.id, dto);
    return this.create(dto);
  }
}
