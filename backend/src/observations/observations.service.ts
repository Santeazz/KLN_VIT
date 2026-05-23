import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { formatChecklistPersonLabel, normalizeNumber } from '../common/utils/person.util';
import { parseMonthPeriod } from '../common/utils/period.util';
import { EmployeesService } from '../employees/employees.service';
import { ChecklistCriterion } from '../templates/entities/checklist-criterion.entity';
import { TemplatesService } from '../templates/templates.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateObservationDto } from './dto/create-observation.dto';
import { ListObservationsDto } from './dto/list-observations.dto';
import { SignObservationDto } from './dto/sign-observation.dto';
import { ObservationSignature, SignatureRole } from './entities/observation-signature.entity';
import { Observation, ObservationStatus } from './entities/observation.entity';
import { ObservationDigestService } from './observation-digest.service';

@Injectable()
export class ObservationsService {
  constructor(
    @InjectRepository(Observation)
    private readonly observationsRepository: Repository<Observation>,
    @InjectRepository(ObservationSignature)
    private readonly signaturesRepository: Repository<ObservationSignature>,
    @InjectRepository(ChecklistCriterion)
    private readonly criteriaRepository: Repository<ChecklistCriterion>,
    private readonly employeesService: EmployeesService,
    private readonly templatesService: TemplatesService,
    private readonly usersService: UsersService,
    private readonly digestService: ObservationDigestService,
  ) {}

  async findAll(query: ListObservationsDto) {
    await this.purgeExpiredObservations();
    const builder = this.createDetailedQueryBuilder();

    if (query.employeeId) {
      builder.andWhere('employee.id = :employeeId', { employeeId: query.employeeId });
    }
    if (query.status) {
      builder.andWhere('observation.status = :status', { status: query.status });
    }
    if (query.month) {
      const { start, end } = parseMonthPeriod(query.month);
      builder.andWhere(
        'observation.observationDate >= :start AND observation.observationDate < :end',
        {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        },
      );
    }

    const observations = await builder.getMany();
    return observations.map((observation) => this.sortObservationResults(observation));
  }

  async getRequired(id: string) {
    await this.purgeExpiredObservations();
    const observation = await this.createDetailedQueryBuilder()
      .andWhere('observation.id = :id', { id })
      .getOne();
    if (!observation) {
      throw new NotFoundException('Контрольный лист наблюдения не найден');
    }
    return this.sortObservationResults(observation);
  }

  async create(dto: CreateObservationDto, observer: User) {
    await this.purgeExpiredObservations();
    const employee = await this.employeesService.getRequired(dto.employeeId);
    this.assertObservationAccess(observer, employee.position);
    const template = await this.templatesService.getRequired(dto.templateId);
    if (!template.isActive) {
      throw new BadRequestException('Выбранный шаблон контрольного листа неактивен');
    }

    const criteria = await this.criteriaRepository.find({
      where: { template: { id: template.id } },
    });
    const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));

    const resultEntities = dto.results.map((result) => {
      const criterion = criteriaById.get(result.criterionId);
      if (!criterion) {
        throw new BadRequestException('Критерий не относится к выбранному шаблону');
      }

      const maxScore = Number(criterion.maxScore);
      if (result.score > maxScore) {
        throw new BadRequestException(
          `Оценка по критерию "${criterion.title}" не может превышать ${maxScore}`,
        );
      }

      const passed = result.passed ?? result.score >= maxScore;
      return {
        criterion,
        criterionTitle: criterion.title,
        criterionDescription: criterion.description,
        score: result.score,
        maxScore,
        passed,
        comment: result.comment,
      };
    });

    const totalScore = resultEntities.reduce((sum, result) => sum + Number(result.score), 0);
    const maxScore = resultEntities.reduce((sum, result) => sum + Number(result.maxScore), 0);
    const percentage = maxScore === 0 ? 0 : Number(((totalScore / maxScore) * 100).toFixed(2));
    const violationsCount = resultEntities.filter((result) => !result.passed).length;

    const observation = this.observationsRepository.create({
      employee,
      observer,
      template,
      observationDate: dto.observationDate,
      position: template.position,
      comment: dto.comment,
      totalScore,
      maxScore,
      percentage,
      violationsCount,
      status: ObservationStatus.DRAFT,
      results: resultEntities,
    });

    return this.observationsRepository.save(observation);
  }

  async sign(id: string, dto: SignObservationDto, user: User) {
    const observation = await this.getRequired(id);
    if (observation.status === ObservationStatus.ARCHIVED) {
      throw new BadRequestException('Архивный контрольный лист нельзя подписывать повторно');
    }

    if (dto.signerRole === SignatureRole.OBSERVER && observation.observer.id !== user.id) {
      throw new BadRequestException(
        'Подпись наблюдателя может поставить только пользователь, создавший КЛН',
      );
    }

    let signerPersonnelNumber = '';

    if (dto.signerRole === SignatureRole.EMPLOYEE) {
      const employeeWithPersonnelNumber = await this.employeesService.getRequiredWithPersonnelNumber(
        observation.employee.id,
      );
      const employeeTabNumber = normalizeNumber(dto.employeeTabNumber);

      if (
        employeeTabNumber !== normalizeNumber(employeeWithPersonnelNumber.personnelNumber)
      ) {
        throw new BadRequestException(
          'Для подписи сотрудника нужно ввести его табельный номер без ошибок',
        );
      }

      signerPersonnelNumber = employeeTabNumber;
    } else {
      const observerWithPersonnelNumber = await this.usersService.getRequiredWithPersonnelNumber(
        user.id,
      );
      signerPersonnelNumber = normalizeNumber(observerWithPersonnelNumber.personnelNumber);
    }

    const documentDigest = this.digestService.createDigest(observation);
    const signedDigest = this.createSimpleSignatureDigest(
      signerPersonnelNumber,
      dto.signerRole,
      documentDigest,
    );
    const existing = await this.signaturesRepository.findOne({
      where: { observation: { id: observation.id }, signerRole: dto.signerRole },
      relations: { observation: true },
    });

    if (existing) {
      throw new BadRequestException(
        dto.signerRole === SignatureRole.OBSERVER
          ? 'Подпись проверяющего уже сохранена'
          : 'Подпись сотрудника уже сохранена',
      );
    }

    if (dto.signerRole === SignatureRole.EMPLOYEE) {
      const observerSignature = await this.signaturesRepository.findOne({
        where: { observation: { id: observation.id }, signerRole: SignatureRole.OBSERVER },
        relations: { observation: true },
      });

      if (!observerSignature) {
        throw new BadRequestException('Сначала КЛН должен быть подписан проверяющим');
      }
    }

    const signedByName = formatChecklistPersonLabel(
      dto.signerRole === SignatureRole.EMPLOYEE
        ? observation.employee.employeeNumber
        : user.employeeNumber,
      dto.signerRole === SignatureRole.EMPLOYEE
        ? observation.employee.fullName
        : user.fullName,
    );

    await this.signaturesRepository.save(
      this.signaturesRepository.create({
        observation,
        signerRole: dto.signerRole,
        signedByName,
        documentDigest,
        signedDigest,
        rawPayload: this.buildSignaturePayload(
          dto.signerRole,
          signedByName,
          documentDigest,
          signerPersonnelNumber,
        ),
      }),
    );

    const signatures = await this.signaturesRepository.find({
      where: { observation: { id: observation.id } },
    });
    const signedRoles = new Set(signatures.map((item) => item.signerRole));
    if (signedRoles.has(SignatureRole.EMPLOYEE) && signedRoles.has(SignatureRole.OBSERVER)) {
      observation.status = ObservationStatus.SIGNED;
      await this.observationsRepository.save(observation);
    }

    return this.getRequired(id);
  }

  async archive(id: string) {
    const observation = await this.getRequired(id);

    if (observation.status !== ObservationStatus.SIGNED) {
      throw new BadRequestException('В архив можно перевести только подписанный КЛН');
    }

    observation.status = ObservationStatus.ARCHIVED;
    return this.observationsRepository.save(observation);
  }

  async purgeExpiredObservations() {
    const cutoffDate = this.getRetentionCutoffDate();

    await this.observationsRepository
      .createQueryBuilder()
      .delete()
      .from(Observation)
      .where('observation_date < :cutoffDate', { cutoffDate })
      .execute();
  }

  private sortObservationResults(observation: Observation) {
    observation.results = [...observation.results].sort((left, right) => {
      const leftOrder = left.criterion?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.criterion?.sortOrder ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.criterionTitle.localeCompare(right.criterionTitle);
    });

    return observation;
  }

  private createDetailedQueryBuilder() {
    return this.observationsRepository
      .createQueryBuilder('observation')
      .leftJoinAndSelect('observation.employee', 'employee')
      .leftJoinAndSelect('observation.observer', 'observer')
      .leftJoinAndSelect('observation.template', 'template')
      .leftJoinAndSelect('observation.results', 'results')
      .leftJoinAndSelect('results.criterion', 'criterion')
      .leftJoinAndSelect('observation.signatures', 'signatures')
      .orderBy('observation.observationDate', 'DESC')
      .addOrderBy('observation.createdAt', 'DESC');
  }

  private getRetentionCutoffDate() {
    const cutoff = new Date();
    const originalDay = cutoff.getDate();

    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(1);
    cutoff.setMonth(cutoff.getMonth() - 3);

    const lastDayOfTargetMonth = new Date(
      cutoff.getFullYear(),
      cutoff.getMonth() + 1,
      0,
    ).getDate();

    cutoff.setDate(Math.min(originalDay, lastDayOfTargetMonth));
    return cutoff.toISOString().slice(0, 10);
  }

  private assertObservationAccess(user: User, employeePosition: string) {
    const normalizedPosition = employeePosition.trim().toLowerCase();

    if (user.role === UserRole.OBSERVER && normalizedPosition !== 'работник пбо') {
      throw new BadRequestException(
        'Инструктор может оформлять КЛН только на работника ПБО',
      );
    }

    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.OBSERVER
    ) {
      throw new BadRequestException('У пользователя нет прав на оформление КЛН');
    }
  }

  private buildSignaturePayload(
    signerRole: SignatureRole,
    signedByName: string,
    documentDigest: string,
    signerPersonnelNumber: string,
  ) {
    return JSON.stringify({
      method: 'simple-electronic-signature',
      signerRole,
      signedByName,
      documentDigest,
      personnelNumberHash: this.hashValue(signerPersonnelNumber),
    });
  }

  private createSimpleSignatureDigest(
    signerPersonnelNumber: string,
    signerRole: SignatureRole,
    documentDigest: string,
  ) {
    return this.hashValue(`${normalizeNumber(signerPersonnelNumber)}:${signerRole}:${documentDigest}`);
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
