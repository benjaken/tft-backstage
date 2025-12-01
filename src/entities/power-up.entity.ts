import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamComp } from './team-comp.entity';

@Entity('power_ups')
@Index('idx_power_up_team_comp_id', ['teamCompId'])
export class PowerUp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @ManyToOne(() => TeamComp, (teamComp) => teamComp.powerUps)
  @JoinColumn({ name: 'team_comp_id' })
  teamComp: TeamComp;

  @Column({ name: 'team_comp_id' })
  teamCompId: number;
}

