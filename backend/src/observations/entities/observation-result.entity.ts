import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChecklistCriterion } from '../../templates/entities/checklist-criterion.entity';
import { Observation } from './observation.entity';

@Entity('observation_results')
export class ObservationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Observation, (observation) => observation.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'observation_id' })
  observation: Observation;

  @ManyToOne(() => ChecklistCriterion, { eager: true, nullable: true })
  @JoinColumn({ name: 'criterion_id' })
  criterion?: ChecklistCriterion;

  @Column({ name: 'criterion_title' })
  criterionTitle: string;

  @Column({ name: 'criterion_description', type: 'text' })
  criterionDescription: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, default: 0 })
  score: number;

  @Column({ name: 'max_score', type: 'numeric', precision: 6, scale: 2, default: 1 })
  maxScore: number;

  @Column()
  passed: boolean;

  @Column({ type: 'text', nullable: true })
  comment?: string;
}
