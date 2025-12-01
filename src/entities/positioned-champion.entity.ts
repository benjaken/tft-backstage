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

@Entity('positioned_champions')
@Index('idx_positioned_champion_team_comp_id', ['teamCompId'])
@Index('idx_positioned_champion_champion_id', ['championId'])
export class PositionedChampion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'tinyint' })
  x: number;

  @Column({ type: 'tinyint' })
  y: number;

  @ManyToOne(() => TeamComp, (teamComp) => teamComp.positioning)
  @JoinColumn({ name: 'team_comp_id' })
  teamComp: TeamComp;

  @Column({ name: 'team_comp_id' })
  teamCompId: number;

  @ManyToOne(() => Champion, (champion) => champion.positionedChampions)
  @JoinColumn({ name: 'champion_id' })
  champion: Champion;

  @Column({ name: 'champion_id' })
  championId: number;
}

