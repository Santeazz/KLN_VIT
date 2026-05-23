import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Observation } from './observation.entity';

export enum SignatureRole {
  EMPLOYEE = 'employee',
  OBSERVER = 'observer',
}

@Entity('observation_signatures')
@Index(['observation', 'signerRole'], { unique: true })
export class ObservationSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Observation, (observation) => observation.signatures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'observation_id' })
  observation: Observation;

  @Column({ name: 'signer_role', type: 'enum', enum: SignatureRole })
  signerRole: SignatureRole;

  @Column({ name: 'signed_by_name' })
  signedByName: string;

  @Column({ name: 'document_digest' })
  documentDigest: string;

  @Column({ name: 'signed_digest', type: 'text' })
  signedDigest: string;

  @Column({ name: 'raw_payload', type: 'text', nullable: true })
  rawPayload?: string;

  @CreateDateColumn({ name: 'signed_at' })
  signedAt: Date;
}
