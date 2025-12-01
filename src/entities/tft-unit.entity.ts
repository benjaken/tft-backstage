import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tft_units')
@Index('idx_tft_unit_name', ['name'])
@Index('idx_tft_unit_season_name', ['season', 'name'])
export class TftUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // 赛季标识，例如 S15 / S16
  @Column({ type: 'varchar', length: 10 })
  season: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ type: 'tinyint', nullable: true })
  cost?: number;

  // 英雄羁绊标签名称列表（例如：超级战队、主宰）
  @Column({ type: 'simple-array', nullable: true })
  traits?: string[];

  // 英雄定位（例如：物理坦克）
  @Column({ type: 'varchar', length: 255, nullable: true })
  role?: string;

  // 攻击距离（激活的 range-box 个数）
  @Column({ type: 'tinyint', nullable: true })
  range?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  skillName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  skillMana?: string;

  @Column({ type: 'text', nullable: true })
  skillDescription?: string;

  // 技能详细数值（skill-divider 之后的每一行）
  @Column({ type: 'json', nullable: true })
  skillDetails?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


