import { ApiProperty } from '@nestjs/swagger';

export class Item {
  @ApiProperty({ description: '装备名称' })
  name: string;

  @ApiProperty({ description: '装备图片 URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: '装备标识/标记', required: false })
  identifier?: string;

  @ApiProperty({ description: '是否被锁定', required: false })
  isLocked?: boolean;

  @ApiProperty({ description: '解锁条件（如果被锁定）', required: false })
  unlockCondition?: string;
}

export class Champion {
  @ApiProperty({ description: '英雄名称' })
  name: string;

  @ApiProperty({ description: '英雄图片 URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: '英雄星级（1-3）', required: false })
  starLevel?: number;

  @ApiProperty({ description: '英雄价格（1-5费）', required: false, minimum: 1, maximum: 5 })
  cost?: number;

  @ApiProperty({ description: '英雄羁绊标签名称列表（例如：超级战队、主宰）', required: false, type: [String] })
  traits?: string[];

  @ApiProperty({ description: '英雄定位（例如：物理坦克）', required: false })
  role?: string;

  @ApiProperty({ description: '攻击距离：激活的 range-box 个数', required: false })
  range?: number;

  @ApiProperty({ description: '技能名称', required: false })
  skillName?: string;

  @ApiProperty({ description: '技能蓝量描述，例如 20/80', required: false })
  skillMana?: string;

  @ApiProperty({ description: '技能简介文案', required: false })
  skillDescription?: string;

  @ApiProperty({
    description: '技能详细数值（skill-divider 之后的每行，例如 Bonus Attack Damage 等）',
    required: false,
    type: () => [SkillDetail],
  })
  skillDetails?: SkillDetail[];

  @ApiProperty({ description: '是否被锁定', required: false })
  isLocked?: boolean;

  @ApiProperty({ description: '解锁条件（如果被锁定）', required: false })
  unlockCondition?: string;

  @ApiProperty({ description: '英雄的装备列表', type: [Item], required: false })
  items?: Item[];
}

export class SkillDetail {
  @ApiProperty({ description: '行标题，例如 Bonus Attack Damage', required: false })
  title?: string;

  @ApiProperty({ description: '行的具体数值文本（带标记）', required: false })
  value?: string;
}

export class PowerUp {
  @ApiProperty({ description: 'PowerUp 名称' })
  name: string;

  @ApiProperty({ description: 'PowerUp 图片 URL', required: false })
  imageUrl?: string;
}

export class EarlyComp {
  @ApiProperty({ description: '早期组合英雄列表', type: [Champion] })
  champions: Champion[];
}

export class Trait {
  @ApiProperty({ description: '特征名称' })
  name: string;

  @ApiProperty({ description: '特征图标 URL', required: false })
  iconUrl?: string;

  @ApiProperty({ description: '特征数量' })
  count: number;

  @ApiProperty({ description: '是否激活', required: false })
  isActive?: boolean;
}

export class CarouselItem {
  @ApiProperty({ description: '基础装备', type: Item })
  baseItem: Item;

  @ApiProperty({ description: '完整装备', type: Item })
  fullItem: Item;
}

export class TeamOption {
  @ApiProperty({ description: '选项等级', required: false })
  level?: string;

  @ApiProperty({ description: '替换出的英雄', type: [Champion], required: false })
  out?: Champion[];

  @ApiProperty({ description: '替换进的英雄', type: [Champion], required: false })
  in?: Champion[];
}

export class PositionedChampion {
  @ApiProperty({ description: '英雄名称' })
  name: string;

  @ApiProperty({ description: '英雄图片 URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'X 坐标（列，0-6）' })
  x: number;

  @ApiProperty({ description: 'Y 坐标（行，0-3）' })
  y: number;
}

export class TeamComp {
  @ApiProperty({ description: '团队组合名称' })
  name: string;

  @ApiProperty({ description: '策略类型', example: 'Slow Roll (6)' })
  strategy: string;

  @ApiProperty({ description: '是否为 Emblem 组合', required: false })
  isEmblem?: boolean;

  @ApiProperty({ description: '是否为 Augment 组合', required: false })
  isAugment?: boolean;

  @ApiProperty({ description: '英雄列表', type: [Champion] })
  champions: Champion[];

  @ApiProperty({
    description: 'PowerUps 列表',
    type: [PowerUp],
    required: false,
  })
  powerUps?: PowerUp[];

  @ApiProperty({ description: '团队代码', required: false })
  teamCode?: string;

  @ApiProperty({ description: '等级（S/A/B等）', required: false })
  tier?: string;

  @ApiProperty({ description: '早期组合', type: EarlyComp, required: false })
  earlyComp?: EarlyComp;

  @ApiProperty({ description: '特征列表', type: [Trait], required: false })
  traits?: Trait[];

  @ApiProperty({ description: '轮播装备列表', type: [CarouselItem], required: false })
  carousel?: CarouselItem[];

  @ApiProperty({ description: '选项列表', type: [TeamOption], required: false })
  options?: TeamOption[];

  @ApiProperty({ description: '位置信息（英雄在棋盘上的位置，7x4网格）', type: [PositionedChampion], required: false })
  positioning?: PositionedChampion[];
}

export class TFTacticsResponseDto {
  @ApiProperty({ description: '页面标题' })
  title: string;

  @ApiProperty({ description: '团队组合列表', type: [TeamComp] })
  teamComps: TeamComp[];

  @ApiProperty({ description: '总数量' })
  total: number;
}

export class TFTUnitsResponseDto {
  @ApiProperty({ description: '英雄列表', type: [Champion] })
  champions: Champion[];

  @ApiProperty({ description: '总数量' })
  total: number;
}
