import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamComp } from './team-comp.entity';
import { TeamOptionChampion } from './team-option-champion.entity';

@Entity('team_options')
@Index('idx_team_option_team_comp_id', ['teamCompId'])
export class TeamOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  level: string;

  @Column({ type: 'varchar', length: 20, default: 'out', name: 'option_type' })
  optionType: 'out' | 'in';

  @ManyToOne(() => TeamComp, (teamComp) => teamComp.options)
  @JoinColumn({ name: 'team_comp_id' })
  teamComp: TeamComp;

  @Column({ name: 'team_comp_id' })
  teamCompId: number;

  @OneToMany(
    () => TeamOptionChampion,
    (teamOptionChampion) => teamOptionChampion.teamOption,
  )
  champions: TeamOptionChampion[];
}

