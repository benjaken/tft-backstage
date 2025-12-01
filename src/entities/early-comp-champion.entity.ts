import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamComp } from './team-comp.entity';
import { Champion } from './champion.entity';

@Entity('early_comp_champions')
@Index('idx_early_comp_champion_team_comp_id', ['teamCompId'])
@Index('idx_early_comp_champion_champion_id', ['championId'])
export class EarlyCompChampion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TeamComp, (teamComp) => teamComp.earlyCompChampions)
  @JoinColumn({ name: 'team_comp_id' })
  teamComp: TeamComp;

  @Column({ name: 'team_comp_id' })
  teamCompId: number;

  @ManyToOne(() => Champion, (champion) => champion.earlyCompChampions)
  @JoinColumn({ name: 'champion_id' })
  champion: Champion;

  @Column({ name: 'champion_id' })
  championId: number;
}

