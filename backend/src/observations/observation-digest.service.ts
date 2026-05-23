import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Observation } from './entities/observation.entity';

@Injectable()
export class ObservationDigestService {
  createDigest(observation: Observation): string {
    const payload = {
      id: observation.id,
      employeeNumber: observation.employee.employeeNumber,
      employeeFullName: observation.employee.fullName,
      observerNumber: observation.observer.employeeNumber,
      observerFullName: observation.observer.fullName,
      template: observation.template.title,
      observationDate: observation.observationDate,
      position: observation.position,
      totalScore: Number(observation.totalScore),
      maxScore: Number(observation.maxScore),
      percentage: Number(observation.percentage),
      violationsCount: observation.violationsCount,
      results: [...observation.results]
        .sort((a, b) => a.criterionTitle.localeCompare(b.criterionTitle))
        .map((result) => ({
          criterionTitle: result.criterionTitle,
          score: Number(result.score),
          maxScore: Number(result.maxScore),
          passed: result.passed,
          comment: result.comment ?? '',
        })),
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
