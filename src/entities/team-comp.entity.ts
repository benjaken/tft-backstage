import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Champion } from './champion.entity';
import { PowerUp } from './power-up.entity';
import { Trait } from './trait.entity';
import { CarouselItem } from './carousel-item.entity';
import { TeamOption } from './team-option.entity';
import { PositionedChampion } from './positioned-champion.entity';
import { EarlyCompChampion } from './early-comp-champion.entity';

@Entity('team_comps')
@Index('idx_team_comp_name', ['name'])
@Index('idx_team_comp_last_crawl_time', ['lastCrawlTime'])
export class TeamComp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  strategy: string;

  @Column({ type: 'boolean', default: false, name: 'is_emblem' })
  isEmblem: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_augment' })
  isAugment: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'team_code' })
  teamCode: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  tier: string;

  @OneToMany(() => Champion, (champion) => champion.teamComp)
  champions: Champion[];

  @OneToMany(() => PowerUp, (powerUp) => powerUp.teamComp)
  powerUps: PowerUp[];

  @OneToMany(() => Trait, (trait) => trait.teamComp)
  traits: Trait[];

  @OneToMany(() => CarouselItem, (carouselItem) => carouselItem.teamComp)
  carousel: CarouselItem[];

  @OneToMany(() => TeamOption, (teamOption) => teamOption.teamComp)
  options: TeamOption[];

  @OneToMany(
    () => PositionedChampion,
    (positionedChampion) => positionedChampion.teamComp,
  )
  positioning: PositionedChampion[];

  @OneToMany(
    () => EarlyCompChampion,
    (earlyCompChampion) => earlyCompChampion.teamComp,
  )
  earlyCompChampions: EarlyCompChampion[];

  @Column({
    type: 'datetime',
    nullable: true,
    name: 'last_crawl_time',
    comment: '最后爬取时间',
  })
  lastCrawlTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

