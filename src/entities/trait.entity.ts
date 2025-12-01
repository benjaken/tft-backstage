import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamComp } from './team-comp.entity';

@Entity('traits')
@Index('idx_trait_team_comp_id', ['teamCompId'])
export class Trait {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl: string;

  @Column({ type: 'int' })
  count: number;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @ManyToOne(() => TeamComp, (teamComp) => teamComp.traits)
  @JoinColumn({ name: 'team_comp_id' })
  teamComp: TeamComp;

  @Column({ name: 'team_comp_id' })
  teamCompId: number;
}

