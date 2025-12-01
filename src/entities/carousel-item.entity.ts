import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamComp } from './team-comp.entity';

@Entity('carousel_items')
@Index('idx_carousel_item_team_comp_id', ['teamCompId'])
export class CarouselItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'base_item_name' })
  baseItemName: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'base_item_image_url' })
  baseItemImageUrl: string;

  @Column({ type: 'varchar', length: 255, name: 'full_item_name' })
  fullItemName: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'full_item_image_url' })
  fullItemImageUrl: string;

  @ManyToOne(() => TeamComp, (teamComp) => teamComp.carousel)
  @JoinColumn({ name: 'team_comp_id' })
  teamComp: TeamComp;

  @Column({ name: 'team_comp_id' })
  teamCompId: number;
}

