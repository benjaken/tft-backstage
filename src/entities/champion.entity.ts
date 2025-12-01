import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { Item } from './item.entity';
import { TeamComp } from './team-comp.entity';
import { EarlyCompChampion } from './early-comp-champion.entity';
import { TeamOptionChampion } from './team-option-champion.entity';
import { PositionedChampion } from './positioned-champion.entity';

@Entity('champions')
@Index('idx_champion_name', ['name'])
@Index('idx_champion_team_comp_id', ['teamCompId'])
@Index('idx_champion_name_team_comp', ['name', 'teamCompId'])
export class Champion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'tinyint', nullable: true })
  starLevel: number;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'text', nullable: true })
  unlockCondition: string;

  @ManyToMany(() => Item, (item) => item.champions)
  @JoinTable({
    name: 'champion_items',
    joinColumn: { name: 'champion_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'item_id', referencedColumnName: 'id' },
  })
  items: Item[];

  @ManyToOne(() => TeamComp, (teamComp) => teamComp.champions)
  @JoinColumn({ name: 'team_comp_id' })
  teamComp: TeamComp;

  @Column({ name: 'team_comp_id' })
  teamCompId: number;

  @OneToMany(
    () => EarlyCompChampion,
    (earlyCompChampion) => earlyCompChampion.champion,
  )
  earlyCompChampions: EarlyCompChampion[];

  @OneToMany(
    () => TeamOptionChampion,
    (teamOptionChampion) => teamOptionChampion.champion,
  )
  teamOptionChampions: TeamOptionChampion[];

  @OneToMany(
    () => PositionedChampion,
    (positionedChampion) => positionedChampion.champion,
  )
  positionedChampions: PositionedChampion[];
}

