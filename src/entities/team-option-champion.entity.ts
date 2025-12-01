import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamOption } from './team-option.entity';
import { Champion } from './champion.entity';

@Entity('team_option_champions')
@Index('idx_team_option_champion_team_option_id', ['teamOptionId'])
@Index('idx_team_option_champion_champion_id', ['championId'])
export class TeamOptionChampion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TeamOption, (teamOption) => teamOption.champions)
  @JoinColumn({ name: 'team_option_id' })
  teamOption: TeamOption;

  @Column({ name: 'team_option_id' })
  teamOptionId: number;

  @ManyToOne(() => Champion, (champion) => champion.teamOptionChampions)
  @JoinColumn({ name: 'champion_id' })
  champion: Champion;

  @Column({ name: 'champion_id' })
  championId: number;
}

