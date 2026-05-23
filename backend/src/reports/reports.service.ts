import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { currentMonth, parseMonthPeriod } from '../common/utils/period.util';
import { Employee } from '../employees/entities/employee.entity';
import { Observation, ObservationStatus } from '../observations/entities/observation.entity';
import { ObservationsService } from '../observations/observations.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Observation)
    private readonly observationsRepository: Repository<Observation>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    private readonly observationsService: ObservationsService,
  ) {}

  async getBonusReport(month = currentMonth()) {
    await this.observationsService.purgeExpiredObservations();
    const { start, end } = parseMonthPeriod(month);
    const employees = await this.employeesRepository.find({
      where: { isActive: true },
      order: { lastName: 'ASC', firstName: 'ASC', middleName: 'ASC' },
    });
    const observations = await this.observationsRepository
      .createQueryBuilder('observation')
      .leftJoinAndSelect('observation.employee', 'employee')
      .where('observation.observationDate >= :start AND observation.observationDate < :end', {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      })
      .andWhere('observation.status IN (:...statuses)', {
        statuses: [ObservationStatus.SIGNED, ObservationStatus.ARCHIVED],
      })
      .getMany();

    const rows = employees.map((employee) => {
      const employeeObservations = observations.filter(
        (observation) => observation.employee.id === employee.id,
      );
      const observationsCount = employeeObservations.length;
      const violationEvents = employeeObservations.filter(
        (observation) => observation.violationsCount > 0,
      ).length;
      const averagePercentage =
        observationsCount === 0
          ? null
          : Number(
              (
                employeeObservations.reduce(
                  (sum, observation) => sum + Number(observation.percentage),
                  0,
                ) / observationsCount
              ).toFixed(2),
            );
      const bonusAllowed = violationEvents < 2;
      return {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        position: employee.position,
        observationsCount,
        violationEvents,
        averagePercentage,
        bonusAllowed,
        decision: bonusAllowed ? 'Премия назначается' : 'Премия не назначается',
        reason: bonusAllowed
          ? 'Количество нарушений меньше установленного предела'
          : 'Зафиксировано два и более наблюдения с невыполнением стандартов',
      };
    });

    return {
      period: month,
      generatedAt: new Date().toISOString(),
      rule:
        'Если за календарный месяц зафиксировано два и более наблюдения с невыполнением критериев КЛН, сотрудник лишается премии.',
      rows,
    };
  }
}
