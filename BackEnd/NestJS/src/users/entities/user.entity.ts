import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
@Index('uq_users_provider_subject', ['authProvider', 'providerSubject'], { unique: true })
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id' })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'password_hash', nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 20, name: 'auth_provider', default: 'local' })
  authProvider!: 'local' | 'google' | 'kakao' | 'naver';

  @Column({ type: 'varchar', length: 255, name: 'provider_subject', nullable: true })
  providerSubject!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
