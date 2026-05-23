import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { buildFullName } from '../../common/utils/person.util';
import { Observation } from '../../observations/entities/observation.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_number', unique: true })
  employeeNumber: string;

  @Column({ name: 'personnel_number', unique: true, select: false })
  personnelNumber: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'middle_name', type: 'varchar', nullable: true })
  middleName?: string | null;

  fullName: string;

  @Column()
  position: string;

  @Column({ type: 'varchar', nullable: true })
  department?: string;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Observation, (observation) => observation.employee)
  observations: Observation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  private syncDerivedFields() {
    this.fullName = buildFullName(this.lastName, this.firstName, this.middleName);
  }
}
