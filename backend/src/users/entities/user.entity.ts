import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { buildFullName } from '../../common/utils/person.util';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  OBSERVER = 'observer',
  HR = 'hr',
}

@Entity('users')
export class User {
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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OBSERVER })
  role: UserRole;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

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
