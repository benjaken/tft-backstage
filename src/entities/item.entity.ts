import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Champion } from './champion.entity';

@Entity('items')
@Index('idx_item_name', ['name'])
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  identifier: string;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'text', nullable: true })
  unlockCondition: string;

  @ManyToMany(() => Champion, (champion) => champion.items)
  champions: Champion[];
}

