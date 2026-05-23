import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChecklistTemplate } from './checklist-template.entity';

@Entity('checklist_criteria')
export class ChecklistCriterion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChecklistTemplate, (template) => template.criteria, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: ChecklistTemplate;

  @Column({ name: 'sort_order', default: 1 })
  sortOrder: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'max_score', type: 'numeric', precision: 6, scale: 2, default: 1 })
  maxScore: number;
}
