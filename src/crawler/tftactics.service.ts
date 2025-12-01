import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import {
  TFTacticsResponseDto,
  TFTUnitsResponseDto,
  TeamComp,
  Champion,
  Item,
  PowerUp,
  Trait,
  CarouselItem,
  TeamOption,
  PositionedChampion,
} from './dto/tftactics.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TFTacticsService {
  private readonly logger = new Logger(TFTacticsService.name);
  // 使用与 list 接口相同的缓存键，共享缓存
  private readonly CACHE_KEY_TEAM_COMPS = 'team_comps_all';
  // 缓存时间：365 天（毫秒）- 实际上相当于无限大，直到下次任务执行清除
  private readonly CACHE_TTL = 365 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async crawlTeamComps(url: string): Promise<TFTacticsResponseDto> {
    // 优先从 Redis 缓存获取数据（缓存时间365天，直到下次任务执行）
    try {
      const cachedData = await this.cacheManager.get<TFTacticsResponseDto>(
        this.CACHE_KEY_TEAM_COMPS,
      );
      if (cachedData) {
        this.logger.debug(
          '从 Redis 缓存获取团队组合数据（爬虫接口，缓存有效期365天）',
        );
        return cachedData;
      }
    } catch (error) {
      this.logger.warn('Redis 缓存获取失败，将继续爬取:', error);
    }

    // Redis 中没有数据，开始爬取
    this.logger.debug('开始从网站爬取团队组合数据');
    let browser: puppeteer.Browser | null = null;
    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        // 如果找不到浏览器，Puppeteer 会自动使用缓存的版本
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      });

      const page = await browser.newPage();

      // 设置视口和 User-Agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // 访问页面
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 等待页面加载完成
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 查找并点击 Set 16 按钮
      try {
        // 使用 page.evaluate 查找 Set 16 按钮的索引
        const set16ButtonIndex = await page.evaluate(() => {
          const buttons = Array.from(
            document.querySelectorAll('.set-btn, [class*="set-btn"]'),
          );
          const index = buttons.findIndex((btn) => {
            const text = btn.textContent || '';
            return text.includes('Set 16') || text.includes('16');
          });
          return index;
        });

        if (set16ButtonIndex >= 0) {
          // 尝试直接点击
          await page.evaluate((index) => {
            const buttons = Array.from(
              document.querySelectorAll('.set-btn, [class*="set-btn"]'),
            );
            const button = buttons[index];
            if (button && button instanceof HTMLElement) {
              button.click();
            }
          }, set16ButtonIndex);

          // 等待内容加载
          await new Promise((resolve) => setTimeout(resolve, 3000));

          try {
            await page.waitForSelector(
              '.team-portrait, [class*="team-portrait"]',
              {
                timeout: 10000,
              },
            );
          } catch {
            // 如果选择器不存在，继续执行
          }
        }
      } catch (error) {
        // 如果点击失败，继续使用当前页面
        console.warn('无法点击 Set 16 按钮，使用当前页面:', error);
      }

      // 获取页面 HTML
      let html = await page.content();
      let $ = cheerio.load(html);

      const title = $('title').text() || 'TFT Team Comps';
      const pageTitleText = title.replace(/·.*$/, '').trim(); // 提取页面标题的主要部分

      // 查找所有团队组合卡片
      // 团队组合卡片在 team-portrait 中
      const teamPortraits = $('.team-portrait, [class*="team-portrait"]');
      console.log(`找到 ${teamPortraits.length} 个 team-portrait 元素`);

      // 点击所有展开按钮以获取完整数据
      try {
        // 等待页面完全加载
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 查找所有展开按钮
        const expandButtons = await page.$$('.team-more, [class*="team-more"]');
        console.log(`找到 ${expandButtons.length} 个展开按钮`);

        // 点击所有展开按钮
        for (let i = 0; i < expandButtons.length; i++) {
          try {
            const button = expandButtons[i];
            const isVisible = await button.evaluate((el) => {
              const rect = el.getBoundingClientRect();
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                window.getComputedStyle(el).display !== 'none'
              );
            });

            if (isVisible) {
              // 滚动到按钮位置
              await page.evaluate((el) => {
                if (el) {
                  (el as HTMLElement).scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }
              }, button);
              await new Promise((resolve) => setTimeout(resolve, 300));

              // 点击按钮
              await page.evaluate((el) => {
                if (el) {
                  (el as HTMLElement).click();
                }
              }, button);

              // 等待展开动画完成
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.warn(`无法点击第 ${i + 1} 个展开按钮:`, error);
          }
        }

        // 等待所有展开内容加载完成
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 重新获取 HTML（包含展开的内容）
        html = await page.content();
        $ = cheerio.load(html);
        console.log('已重新获取 HTML，包含展开内容');
      } catch (error) {
        console.warn('点击展开按钮时出错，使用原始 HTML:', error);
      }

      const teamComps: TeamComp[] = [];

      // 重新获取 team-portraits（因为 HTML 已更新）
      const updatedTeamPortraits = $(
        '.team-portrait, [class*="team-portrait"]',
      );
      console.log(
        `找到 ${updatedTeamPortraits.length} 个 team-portrait 元素（重新获取后）`,
      );

      updatedTeamPortraits.each((index, element) => {
        const $comp = $(element);

        // 提取团队组合名称（在 team-name-elipsis 中，需要排除 team-name-extra）
        const teamNameElipsis = $comp.find(
          '.team-name-elipsis, [class*="team-name-elipsis"]',
        );
        let name = '';
        if (teamNameElipsis.length > 0) {
          // 克隆元素，移除 team-name-extra 子元素，然后获取文本
          const $clone = teamNameElipsis.clone();
          $clone.find('.team-name-extra, [class*="team-name-extra"]').remove();
          name = $clone.text().trim();
        }

        // 如果没找到，尝试其他方法
        if (!name) {
          name =
            $comp
              .find('h2, h3, [class*="name"], [class*="title"]')
              .first()
              .text()
              .trim() ||
            $comp.find('.comp-name, .team-name').text().trim() ||
            '未知组合';
        }

        // 跳过页面标题（第一个数据通常是页面标题）
        if (
          name === pageTitleText ||
          name === title ||
          name.includes('TFT Meta Team Comps') ||
          name.includes('Tier List')
        ) {
          console.log(`跳过页面标题: ${name}`);
          return; // 跳过这个元素
        }

        // 提取评级（在 team-rank 中）
        const tier =
          $comp.find('.team-rank, [class*="team-rank"]').text().trim() ||
          $comp
            .closest('[class*="tier"]')
            .attr('class')
            ?.match(/tier-([SAB])/i)?.[1]
            ?.toUpperCase() ||
          undefined;

        // 提取策略类型（在 team-playstyle 中）
        const strategyText =
          $comp
            .find('.team-playstyle, [class*="team-playstyle"]')
            .text()
            .trim() ||
          $comp
            .find('.team-name-extra, [class*="team-name-extra"]')
            .text()
            .trim() ||
          $comp
            .find('[class*="strategy"], [class*="type"], .strategy')
            .text()
            .trim() ||
          $comp
            .text()
            .match(
              /(Slow Roll|Fast 8|Standard|Emblem|Augment)[\s(]*\d*\)?/,
            )?.[0] ||
          '';

        // 检查是否为 Emblem 或 Augment 组合
        const isEmblem =
          $comp.text().includes('Emblem') || strategyText.includes('Emblem');
        const isAugment =
          $comp.text().includes('Augment') || strategyText.includes('Augment');

        // 提取英雄（从 team-characters 中的 characters-item）
        const champions: Champion[] = [];
        // 查找英雄容器（team-characters 中的 characters-item，排除装备项）
        const teamCharacters = $comp.find(
          '.team-characters, [class*="team-characters"]',
        );

        // 遍历每个 characters-item，但需要找到对应的英雄名称和装备
        teamCharacters
          .find('a.characters-item[href*="/champions/"]')
          .each((_, champEl) => {
            const $champ = $(champEl);
            const $img = $champ.find('img.character-icon').first();
            const alt = $img.attr('alt') || '';
            const src = $img.attr('src') || $img.attr('data-src') || '';

            // 获取英雄名称（从 team-character-name 或 alt 属性）
            const championName =
              $champ.find('.team-character-name').text().trim() ||
              $champ.next('.team-character-name').text().trim() ||
              alt ||
              '';

            if (
              !championName ||
              championName === 'champion' ||
              championName.length > 30
            ) {
              return; // 跳过无效的英雄
            }

            const champion: Champion = {
              name: championName,
              imageUrl: src.startsWith('http')
                ? src
                : src
                  ? new URL(src, url).href
                  : undefined,
            };

            // 提取星级（从类名中，比如 l3 表示3星）
            const classAttr = $champ.attr('class') || '';
            const starMatch = classAttr.match(/l(\d)/);
            if (starMatch) {
              champion.starLevel = parseInt(starMatch[1], 10);
            }

            // 提取装备（装备容器是英雄元素的下一个兄弟元素 character-items）
            // 根据 HTML 结构：<a class="characters-item">...</a><div class="character-items">...</div>
            // 装备容器是英雄元素的兄弟元素，不是子元素
            const heroHref = $champ.attr('href') || '';
            let characterItemsContainer = $champ.next(
              '.character-items, [class*="character-items"]',
            );

            // 如果下一个元素不是 character-items，可能是 team-character-name，再下一个才是 character-items
            if (characterItemsContainer.length === 0) {
              const $next = $champ.next();
              if (
                $next.hasClass('team-character-name') ||
                $next.attr('class')?.includes('team-character-name')
              ) {
                characterItemsContainer = $next.next(
                  '.character-items, [class*="character-items"]',
                );
              }
            }

            // 验证装备容器是否属于当前英雄（检查容器内第一个链接是否指向当前英雄）
            if (characterItemsContainer.length > 0 && heroHref) {
              const firstLink = characterItemsContainer
                .find('a.characters-item[href*="/champions/"]')
                .first();
              const containerFirstHref = firstLink.attr('href') || '';

              // 只有当装备容器的第一个链接指向当前英雄时，才提取装备
              if (containerFirstHref === heroHref || !containerFirstHref) {
                const championItems: Item[] = [];
                // 查找装备图片（在 character-items 内的 a.characters-item 中）
                characterItemsContainer
                  .find(
                    'a.characters-item img.character-icon, img.character-icon',
                  )
                  .each((_, itemEl) => {
                    const $itemEl = $(itemEl);
                    const itemAlt = $itemEl.attr('alt') || '';
                    const itemSrc =
                      $itemEl.attr('src') || $itemEl.attr('data-src') || '';

                    // 检查是否是装备（不是英雄图片）
                    // 装备图片路径必须包含 /items/ 或 items/
                    if (
                      itemAlt &&
                      !itemAlt.includes('champion') &&
                      !itemAlt.includes('PowerUps') &&
                      !itemAlt.includes('Unlock') &&
                      itemAlt.length > 0 &&
                      (itemSrc.includes('/items/') ||
                        itemSrc.includes('items/'))
                    ) {
                      championItems.push({
                        name: itemAlt.trim(),
                        imageUrl: itemSrc.startsWith('http')
                          ? itemSrc
                          : itemSrc
                            ? new URL(itemSrc, url).href
                            : undefined,
                      });
                    }
                  });
                // 只有当找到装备时才添加
                if (championItems.length > 0) {
                  champion.items = championItems;
                }
              }
            }

            // 检查是否被锁定
            const isLocked =
              $champ.find(
                '[class*="lock"], [class*="locked"], .lock-icon, img[alt*="lock"]',
              ).length > 0 ||
              $champ.hasClass('locked') ||
              $champ.attr('data-locked') === 'true';

            if (isLocked) {
              champion.isLocked = true;
              // 提取解锁条件
              const unlockText =
                $champ
                  .find(
                    '[class*="unlock"], [class*="condition"], [title*="unlock"]',
                  )
                  .text()
                  .trim() ||
                $champ.attr('title')?.match(/unlock[:\s]+(.+)/i)?.[1] ||
                $champ.attr('data-unlock') ||
                $champ.find('[class*="tooltip"]').text().trim();
              if (unlockText) {
                champion.unlockCondition = unlockText;
              }
            }

            champions.push(champion);
          });

        // 如果没有找到，尝试通过图片查找
        if (champions.length === 0) {
          $comp
            .find(
              'img[alt*="champion"], [class*="champion"] img, [data-champion]',
            )
            .each((_, img) => {
              const $img = $(img);
              const alt = $img.attr('alt') || '';
              const src = $img.attr('src') || $img.attr('data-src') || '';

              if (alt && alt !== 'champion') {
                const $parent = $img.parent();
                const champion: Champion = {
                  name: alt.replace(/[^a-zA-Z\s]/g, '').trim(),
                  imageUrl: src.startsWith('http')
                    ? src
                    : src
                      ? new URL(src, url).href
                      : undefined,
                };

                // 尝试提取星级
                const starClassMatch = $parent
                  .attr('class')
                  ?.match(/star[_-]?(\d)/i);
                const starPathMatch = src.match(/[_-](\d)star/i);
                const starAltMatch = alt.match(/[_-](\d)star/i);

                if (starClassMatch) {
                  champion.starLevel = parseInt(starClassMatch[1], 10);
                } else if (starPathMatch) {
                  champion.starLevel = parseInt(starPathMatch[1], 10);
                } else if (starAltMatch) {
                  champion.starLevel = parseInt(starAltMatch[1], 10);
                }

                champions.push(champion);
              }
            });
        }

        // 如果没有通过图片找到，尝试通过文本查找
        if (champions.length === 0) {
          // 查找可能包含英雄名称的元素
          $comp.find('[class*="champion-name"], .champion').each((_, el) => {
            const name = $(el).text().trim();
            if (name && name.length > 0 && name.length < 20) {
              champions.push({ name });
            }
          });
        }

        // 提取 PowerUps
        const powerUps: PowerUp[] = [];
        $comp
          .find('[class*="powerup"], [class*="power-up"], .powerup')
          .each((_, el) => {
            const $el = $(el);
            const name = $el.text().trim() || $el.find('img').attr('alt') || '';
            const img = $el.find('img');
            const src = img.attr('src') || img.attr('data-src') || '';

            if (name) {
              powerUps.push({
                name,
                imageUrl: src.startsWith('http')
                  ? src
                  : src
                    ? new URL(src, url).href
                    : undefined,
              });
            }
          });

        // 提取团队代码
        const teamCode =
          $comp
            .find('[class*="code"], .team-code, button[class*="copy"]')
            .text()
            .trim() ||
          $comp
            .find('button')
            .filter((_, btn) => $(btn).text().includes('Copy'))
            .prev()
            .text()
            .trim() ||
          undefined;

        // 提取展开区域的数据（team-expanded）
        const $expanded = $comp.find(
          '.team-expanded, [class*="team-expanded"]',
        );

        console.log('找到展开区域:', $expanded.length > 0);
        if ($expanded.length > 0) {
          console.log('展开区域 HTML 长度:', ($expanded.html() || '').length);
        }

        // 提取早期组合（Early Comp）
        // eslint-disable-next-line
        let earlyComp: { champions: Champion[] } | undefined;
        const $earlyCompGroup = $expanded.find(
          '.team-expanded-group.mid, [class*="team-expanded-group"][class*="mid"]',
        );
        if ($earlyCompGroup.length > 0) {
          const earlyChampions: Champion[] = [];
          $earlyCompGroup
            .find('a.characters-item[href*="/champions/"]')
            .each((_, champEl) => {
              const $champ = $(champEl);
              const $img = $champ.find('img.character-icon').first();
              const alt = $img.attr('alt') || '';
              const src = $img.attr('src') || $img.attr('data-src') || '';

              if (alt && alt !== 'champion') {
                earlyChampions.push({
                  name: alt.trim(),
                  imageUrl: src.startsWith('http')
                    ? src
                    : src
                      ? new URL(src, url).href
                      : undefined,
                });
              }
            });
          if (earlyChampions.length > 0) {
            earlyComp = { champions: earlyChampions };
          }
        }

        // 提取特征（Traits）
        const traits: Trait[] = [];
        const $traitsGroup = $expanded.find(
          '.team-expanded-group.builder, [class*="team-expanded-group"][class*="builder"]',
        );
        if ($traitsGroup.length > 0) {
          $traitsGroup
            .find('.builder-bonus-item, [class*="builder-bonus-item"]')
            .each((_, traitEl) => {
              const $trait = $(traitEl);
              const $icon = $trait
                .find('img.type-icon, img.origin-icon')
                .first();
              const traitName =
                $icon.attr('alt') ||
                $trait.attr('search') ||
                $trait.find('[class*="name"]').text().trim() ||
                '';
              const iconUrl = $icon.attr('src') || '';
              const countText =
                $trait.find('.builder-bonus-counter span').text().trim() || '0';
              const count = parseInt(countText, 10) || 0;
              const isActive = $trait.hasClass('active');

              if (traitName) {
                traits.push({
                  name: traitName,
                  iconUrl: iconUrl.startsWith('http')
                    ? iconUrl
                    : iconUrl
                      ? new URL(iconUrl, url).href
                      : undefined,
                  count,
                  isActive,
                });
              }
            });
        }

        // 提取轮盘装备（Carousel）
        const carousel: CarouselItem[] = [];
        const $carouselGroup = $expanded.find(
          '.team-expanded-group.items, [class*="team-expanded-group"][class*="items"]',
        );
        if ($carouselGroup.length > 0) {
          $carouselGroup
            .find('.carousel-component, [class*="carousel-component"]')
            .each((_, carouselEl) => {
              const $carousel = $(carouselEl);
              const $baseItem = $carousel
                .find(
                  '.carousel-component > a.characters-item img, [class*="carousel-component"] > a img',
                )
                .first();
              const $fullItem = $carousel
                .find('.carousel-full img, [class*="carousel-full"] img')
                .first();

              if ($baseItem.length > 0 && $fullItem.length > 0) {
                const baseAlt = $baseItem.attr('alt') || '';
                const baseSrc = $baseItem.attr('src') || '';
                const fullAlt = $fullItem.attr('alt') || '';
                const fullSrc = $fullItem.attr('src') || '';

                if (baseAlt && fullAlt) {
                  carousel.push({
                    baseItem: {
                      name: baseAlt.trim(),
                      imageUrl: baseSrc.startsWith('http')
                        ? baseSrc
                        : baseSrc
                          ? new URL(baseSrc, url).href
                          : undefined,
                    },
                    fullItem: {
                      name: fullAlt.trim(),
                      imageUrl: fullSrc.startsWith('http')
                        ? fullSrc
                        : fullSrc
                          ? new URL(fullSrc, url).href
                          : undefined,
                    },
                  });
                }
              }
            });
        }

        // 提取选项（Options）
        const options: TeamOption[] = [];
        const $optionsGroup = $expanded.find(
          '.team-expanded-group.options, [class*="team-expanded-group"][class*="options"]',
        );
        if ($optionsGroup.length > 0) {
          $optionsGroup
            .find('.team-option, [class*="team-option"]')
            .each((_, optionEl) => {
              const $option = $(optionEl);
              const level = $option
                .find('.option-out .lv9, [class*="lv"]')
                .text()
                .trim();
              const outChampions: Champion[] = [];
              const inChampions: Champion[] = [];

              // 提取替换出的英雄
              $option
                .find('.option-out a.characters-item[href*="/champions/"]')
                .each((_, champEl) => {
                  const $champ = $(champEl);
                  const $img = $champ.find('img.character-icon').first();
                  const alt = $img.attr('alt') || '';
                  const src = $img.attr('src') || $img.attr('data-src') || '';

                  if (alt && alt !== 'champion') {
                    outChampions.push({
                      name: alt.trim(),
                      imageUrl: src.startsWith('http')
                        ? src
                        : src
                          ? new URL(src, url).href
                          : undefined,
                    });
                  }
                });

              // 提取替换进的英雄
              $option
                .find('.option-in a.characters-item[href*="/champions/"]')
                .each((_, champEl) => {
                  const $champ = $(champEl);
                  const $img = $champ.find('img.character-icon').first();
                  const alt = $img.attr('alt') || '';
                  const src = $img.attr('src') || $img.attr('data-src') || '';

                  if (alt && alt !== 'champion') {
                    inChampions.push({
                      name: alt.trim(),
                      imageUrl: src.startsWith('http')
                        ? src
                        : src
                          ? new URL(src, url).href
                          : undefined,
                    });
                  }
                });

              if (outChampions.length > 0 || inChampions.length > 0 || level) {
                options.push({
                  level: level || undefined,
                  out: outChampions.length > 0 ? outChampions : undefined,
                  in: inChampions.length > 0 ? inChampions : undefined,
                });
              }
            });
        }

        // 提取站位（Positioning）- 7x4 网格（28个格子，从上到下，每行7个）
        const positioning: PositionedChampion[] = [];
        const $positioningGroup = $expanded.find(
          '.team-expanded-group.positioning, [class*="team-expanded-group"][class*="positioning"]',
        );
        if ($positioningGroup.length > 0) {
          // 查找 hexGrid（站位网格）- 只使用第一个
          const $hexGrid = $positioningGroup
            .find('#hexGrid, [id*="hexGrid"], ul.four-row, [class*="hexGrid"]')
            .first();

          if ($hexGrid.length > 0) {
            // 获取所有 hex 格子（直接子元素 li.hex）
            const hexElements = $hexGrid.children('li.hex, li[class*="hex"]');
            console.log(`找到 ${hexElements.length} 个 hex 格子`);

            // 使用 Set 来去重（基于 x, y 坐标）
            const positionSet = new Set<string>();

            // 遍历所有 hex 格子（7列 x 4行 = 28个格子）
            // 按顺序从上到下，每行7个：index 0-6 是第一行，7-13 是第二行，14-20 是第三行，21-27 是第四行
            hexElements.each((index, hexEl) => {
              const $hex = $(hexEl);

              // 计算位置：7列 x 4行
              // index 从 0 开始，计算 x 和 y 坐标
              // x = index % 7 (列，0-6)
              // y = Math.floor(index / 7) (行，0-3)
              const x = index % 7; // 列（0-6）
              const y = Math.floor(index / 7); // 行（0-3）

              // 验证坐标是否在有效范围内（只处理前28个格子）
              if (index >= 28) {
                return; // 跳过超出范围的格子
              }

              if (x < 0 || x > 6 || y < 0 || y > 3) {
                console.warn(`无效的坐标: (${x}, ${y}), index: ${index}`);
                return; // 跳过无效坐标
              }

              // 查找格子中的英雄
              const $champ = $hex.find(
                'a.characters-item[href*="/champions/"]',
              );
              if ($champ.length > 0) {
                const $img = $champ.find('img.character-icon').first();
                const alt = $img.attr('alt') || '';
                const src = $img.attr('src') || $img.attr('data-src') || '';

                if (alt && alt !== 'champion') {
                  // 使用坐标作为唯一标识来去重
                  const positionKey = `${x},${y}`;
                  if (!positionSet.has(positionKey)) {
                    positionSet.add(positionKey);
                    positioning.push({
                      name: alt.trim(),
                      imageUrl: src.startsWith('http')
                        ? src
                        : src
                          ? new URL(src, url).href
                          : undefined,
                      x,
                      y,
                    });
                  } else {
                    console.warn(
                      `重复的位置: (${x}, ${y}), 英雄: ${alt}, index: ${index}`,
                    );
                  }
                }
              }
            });

            console.log(`提取到 ${positioning.length} 个站位数据`);
          } else {
            console.log('未找到 hexGrid');
          }
        }

        // 验证是否是有效的团队组合（跳过页面标题和其他无效数据）
        // 检查是否是无效数据：
        // 1. 名称是页面标题相关
        // 2. 英雄数量过多（超过15个可能是特征列表）
        // 3. 没有策略类型且英雄数量很多
        // 4. 第一个元素且名称包含特定关键词
        const isInvalidName =
          name === pageTitleText ||
          name === title ||
          name.includes('TFT Meta Team Comps') ||
          name.includes('Tier List') ||
          name.includes('Teamfight Tactics') ||
          name.includes('Navigation') ||
          name.includes('Champions') ||
          name.includes('Traits');

        const hasTooManyChampions = champions.length > 15;
        const hasNoStrategyAndManyChampions =
          (!strategyText || strategyText === 'Standard') &&
          champions.length > 10;
        const isFirstInvalidElement =
          index === 0 &&
          (isInvalidName ||
            hasTooManyChampions ||
            (champions.length > 5 && !strategyText));

        const isValidTeamComp =
          name &&
          name !== '未知组合' &&
          !isInvalidName &&
          !hasTooManyChampions &&
          !hasNoStrategyAndManyChampions &&
          !isFirstInvalidElement &&
          champions.length > 0 &&
          champions.length <= 15 && // 正常团队组合通常不超过15个英雄
          // 确保不是只包含特征名称的列表
          (champions.some((c) => c.items && c.items.length > 0) ||
            (strategyText && strategyText !== 'Standard'));

        if (isValidTeamComp) {
          teamComps.push({
            name,
            strategy: strategyText || 'Standard',
            isEmblem,
            isAugment,
            champions,
            powerUps: powerUps.length > 0 ? powerUps : undefined,
            teamCode,
            tier,
            earlyComp: earlyComp || undefined,
            traits: traits.length > 0 ? traits : undefined,
            carousel: carousel.length > 0 ? carousel : undefined,
            options: options.length > 0 ? options : undefined,
            positioning: positioning.length > 0 ? positioning : undefined,
          });
        } else {
          console.log(
            `跳过无效的团队组合: ${name} (英雄数: ${champions.length})`,
          );
        }
      });

      const result = {
        title,
        teamComps,
        total: teamComps.length,
      };

      // 先保存到数据库（会自动清除缓存，确保数据一致性）
      try {
        await this.databaseService.saveTeamComps(result);
        this.logger.log(`成功保存 ${teamComps.length} 个团队组合到数据库`);
      } catch (error) {
        this.logger.error('保存到数据库失败:', error);
        // 不抛出错误，仍然返回数据
      }

      // 保存到数据库后，将爬取结果存入 Redis 缓存（365天有效期，相当于无限大，直到下次任务执行清除）
      // 注意：必须在 saveTeamComps 之后存入，因为 saveTeamComps 会清除缓存
      try {
        await this.cacheManager.set(
          this.CACHE_KEY_TEAM_COMPS,
          result,
          this.CACHE_TTL,
        );
        this.logger.log(
          `✅ 已将爬取数据存入 Redis 缓存 (缓存键: ${this.CACHE_KEY_TEAM_COMPS}，有效期：365天，数据量：${result.total}个)`,
        );
      } catch (error) {
        this.logger.error('❌ Redis 缓存存储失败:', error);
      }

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new HttpException(
        `爬取失败: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // 确保关闭浏览器
      if (browser) {
        await browser.close().catch(() => {
          // 忽略关闭错误
        });
      }
    }
  }

  /**
   * 爬取 DataTFT 英雄数据库数据（名称、图片、价格等）
   */
  async crawlUnits(url: string, season = 'S15'): Promise<TFTUnitsResponseDto> {
    this.logger.debug(`开始从 DataTFT 爬取英雄数据: ${url}，赛季: ${season}`);
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // 先把 localStorage.language 设置为 US 再进入页面，确保加载英文数据
      await page.evaluateOnNewDocument(() => {
        try {
          window.localStorage.setItem('language', 'US');
        } catch {
          // ignore
        }
      });

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 进入页面后再次设置一次，防止页面脚本覆盖
      await page.evaluate(() => {
        try {
          window.localStorage.setItem('language', 'US');
        } catch {
          // ignore
        }
      });

      // 等待前端渲染完成
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const html = await page.content();
      const $ = cheerio.load(html);

      const champions: Champion[] = [];

      // 将 skill-desc 中的特殊 span（miplus-health 等）用标记符号包裹记录
      const formatSkillDesc = ($root: cheerio.Cheerio): string => {
        let result = '';
        $root.contents().each((_, node) => {
          const $node = $(node);
          if (node.type === 'text') {
            result += ($node.text() || '').trim();
            return;
          }

          // 带 miplus-xxx 的 span，用特殊标记包裹
          if (node.type === 'tag' && node.name === 'span') {
            const classAttr = $node.attr('class') || '';
            const cls =
              classAttr.split(/\s+/).find((c) => c.startsWith('miplus-')) || '';
            let start = '';
            let end = '';
            if (cls === 'miplus-health') {
              start = '[HP]';
              end = '[/HP]';
            } else if (cls === 'miplus-physicalDamage') {
              start = '[AD]';
              end = '[/AD]';
            } else if (cls === 'miplus-scaleLevel') {
              start = '[SCALING]';
              end = '[/SCALING]';
            }
            const inner = formatSkillDesc($node);
            result += start + inner + end;
            return;
          }

          // 技能描述中的属性图标 <img class="miplus-attr-img" ...>
          if (node.type === 'tag' && node.name === 'img') {
            const classAttr = $node.attr('class') || '';
            if (classAttr.includes('miplus-attr-img')) {
              const src = ($node.attr('src') || '').toLowerCase();
              let marker = '';
              if (src.includes('/ap.png')) {
                marker = '[AP][/AP]';
              } else if (src.includes('/ad.png')) {
                marker = '[AD_ICON][/AD_ICON]';
              } else if (src.includes('/hp.png')) {
                marker = '[HP_ICON][/HP_ICON]';
              }
              if (marker) {
                result += marker;
                return;
              }
            }
          }

          // 其他标签直接递归文本
          result += formatSkillDesc($node);
        });
        return result;
      };

      // DataTFT 英雄卡片：当前页面使用 hero-col-wrapper-detail 这一列容器
      // 兼容一些可能的 class 写法
      const unitCards = $(
        '.hero-col-wrapper.hero-col-wrapper-detail, .hero-col-wrapper-detail, [class*="hero-col-wrapper-detail"]',
      );
      this.logger.log(
        `在 DataTFT 页面上找到 ${unitCards.length} 个候选英雄元素`,
      );

      unitCards.each((_, el) => {
        const $el = $(el);

        // 名称
        const name =
          $el.find('.hero-name').first().text().trim() ||
          $el
            .find('[class*="unit-name"], .unit-name, [class*="name"]')
            .first()
            .text()
            .trim() ||
          $el.find('img[alt]').first().attr('alt')?.trim() ||
          '';

        if (!name) {
          return;
        }

        // 图片
        const $img =
          $el
            .find('img[class*="unit"], img[alt]')
            .filter((_, img) => {
              const $imgEl = $(img);
              return !!$imgEl.attr('src') || !!$imgEl.attr('data-src');
            })
            .first() || $el.find('img').first();

        const rawSrc = $img.attr('src') || $img.attr('data-src') || '';
        // eslint-disable-next-line
        let imageUrl: string | undefined;
        if (rawSrc && !rawSrc.startsWith('data:')) {
          if (rawSrc.startsWith('http')) {
            imageUrl = rawSrc;
          } else if (rawSrc.startsWith('/')) {
            imageUrl = new URL(rawSrc, url).href;
          }
        }

        // 价格（1~5 费）优先从 hero-price 文本获取
        // eslint-disable-next-line
        let cost: number | undefined;
        const heroPriceText = $el
          .find('.hero-price-wrapper .hero-price')
          .first()
          .text()
          .trim();
        if (heroPriceText) {
          const parsed = parseInt(heroPriceText, 10);
          if (!Number.isNaN(parsed)) {
            cost = parsed;
          }
        }

        if (!cost) {
          const costAttrRaw = $el.attr('data-cost');
          if (typeof costAttrRaw === 'string' && costAttrRaw) {
            const parsed = parseInt(costAttrRaw, 10);
            if (!Number.isNaN(parsed)) {
              cost = parsed;
            }
          }
        }

        if (!cost) {
          const costText =
            $el
              .find('[class*="cost"], .unit-cost, [class*="gold"]')
              .first()
              .text()
              .replace(/[^0-9]/g, '') || '';
          if (costText) {
            const parsed = parseInt(costText, 10);
            if (!Number.isNaN(parsed)) {
              cost = parsed;
            }
          }
        }

        if (cost && (cost < 1 || cost > 5)) {
          cost = undefined;
        }

        const champion: Champion = {
          name,
          imageUrl,
        };

        if (cost) {
          champion.cost = cost;
        }

        // 羁绊标签
        const traits: string[] = [];
        $el
          .find('.hero-traits .hero-trait .hero-trait-name')
          .each((_, traitEl) => {
            const text = $(traitEl).text().trim();
            if (text) {
              traits.push(text);
            }
          });
        if (traits.length > 0) {
          champion.traits = traits;
        }

        // 英雄定位
        const roleText = $el
          .find('.hero-right-box .hero-role')
          .first()
          .text()
          .trim();
        if (roleText) {
          champion.role = roleText;
        }

        // 攻击距离：激活的 range-box 个数
        const rangeActive = $el.find(
          '.hero-range .range-boxes .range-box.range-box-active',
        ).length;
        if (rangeActive > 0) {
          champion.range = rangeActive;
        }

        // 技能信息
        const $skill = $el.find('.skill-popup-wrapper').first();
        if ($skill.length > 0) {
          const skillName = $skill.find('.skill-name').first().text().trim();
          if (skillName) {
            champion.skillName = skillName;
          }

          const skillMana = $skill.find('.skill-magic').first().text().trim();
          if (skillMana) {
            champion.skillMana = skillMana;
          }

          // 技能简介：只保留 skill-desc 中 skill-divider 之前的内容
          const $skillDescOrigin = $skill.find('.skill-desc').first();
          const $skillDesc = $skillDescOrigin.clone();
          // 删除 skill-divider 以及其之后的兄弟节点（这些会放到 skillDetails 里）
          const $divider = $skillDesc.find('.skill-divider').first();
          if ($divider.length > 0) {
            $divider.nextAll().remove();
            $divider.remove();
          }
          const skillDesc = formatSkillDesc($skillDesc);
          if (skillDesc) {
            champion.skillDescription = skillDesc;
          }

          // skill-divider 以下的技能详细条目，例如 Bonus Attack Damage 等
          const skillDetails: { title: string; value: string }[] = [];
          const $detailLines = $skillDescOrigin
            .find('.skill-divider')
            .first()
            .nextAll('.skill-flex');
          $detailLines.each((_, line) => {
            const $line = $(line);
            const $cols = $line.children('div');
            if ($cols.length === 0) {
              return;
            }
            // 使用 formatSkillDesc 处理两列，保证 miplus-health、属性图标等标记在 skillDetails 中也能体现
            const title = formatSkillDesc($cols.eq(0));
            const value = $cols.length > 1 ? formatSkillDesc($cols.eq(1)) : '';
            if (title || value) {
              skillDetails.push({ title, value });
            }
          });
          if (skillDetails.length > 0) {
            champion.skillDetails = skillDetails;
          }
        }

        champions.push(champion);
      });

      this.logger.log(`成功从 DataTFT 提取 ${champions.length} 个英雄`);

      const result: TFTUnitsResponseDto = {
        champions,
        total: champions.length,
      };
      // 保存到数据库（按赛季维度）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.databaseService.saveUnits(result, season);
      this.logger.log(
        `已将 ${champions.length} 个英雄保存到数据库，赛季: ${season}`,
      );

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new HttpException(
        `爬取 DataTFT 英雄数据失败: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (browser) {
        await browser.close().catch(() => {
          // 忽略关闭错误
        });
      }
    }
  }
}
