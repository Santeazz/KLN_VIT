import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { ChecklistTemplate } from '../../templates/entities/checklist-template.entity';
import { User } from '../../users/entities/user.entity';
import { ObservationResult } from './observation-result.entity';
import { ObservationSignature } from './observation-signature.entity';

export enum ObservationStatus {
  DRAFT = 'draft',
  SIGNED = 'signed',
  ARCHIVED = 'archived',
}

@Entity('observations')
export class Observation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.observations, { eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'observer_id' })
  observer: User;

  @ManyToOne(() => ChecklistTemplate, { eager: true })
  @JoinColumn({ name: 'template_id' })
  template: ChecklistTemplate;

  @Column({ name: 'observation_date', type: 'date' })
  observationDate: string;

  @Column()
  position: string;

  @Column({ type: 'enum', enum: ObservationStatus, default: ObservationStatus.DRAFT })
  status: ObservationStatus;

  @Column({ name: 'total_score', type: 'numeric', precision: 8, scale: 2, default: 0 })
  totalScore: number;

  @Column({ name: 'max_score', type: 'numeric', precision: 8, scale: 2, default: 0 })
  maxScore: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, default: 0 })
  percentage: number;

  @Column({ name: 'violations_count', default: 0 })
  violationsCount: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @OneToMany(() => ObservationResult, (result) => result.observation, {
    cascade: true,
    eager: true,
  })
  results: ObservationResult[];

  @OneToMany(() => ObservationSignature, (signature) => signature.observation, {
    cascade: true,
    eager: true,
  })
  signatures: ObservationSignature[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
