
import { GameStats, GeminiResponse, Dilemma, Location, TacticalCard } from "../types";

// Import Narrative Data Modules
import { 
    RAID_SUCCESS_TEXTS, RAID_FAIL_TEXTS, BAYONET_FIGHT_TEXTS, ATTACK_TEXTS, 
    WOUNDED_DEATH_SCENES, DEATH_FLAVOR_TEMPLATES, FORT_DAMAGE_SCENES 
} from "../data/text/combat";

import { 
    COMMAND_RESPONSES, BUILD_SCENES, HEAL_SUCCESS_SCENES, SPEECH_SCENES 
} from "../data/text/commands";

import { 
    NEW_SUPPLY_DILEMMAS, ALL_DILEMMAS, MUTINY_SCENES, TACTICAL_CARDS, ENEMY_INTEL_BY_DAY 
} from "../data/text/events";

import { 
    GENERAL_CHATTER, SOLDIER_NAMES, SOLDIER_ORIGINS 
} from "../data/text/chatter";

// Helper to check text matching
const matchIntent = (input: string, keywords: string[]): boolean => {
    return keywords.some(k => input.includes(k));
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getConversationalResponse = (input: string): string => {
    // 1. Meta / Identity
    if (matchIntent(input, ['你是谁', '我是谁', '介绍', '名字', '身份', '穿越', '系统'])) return pick(GENERAL_CHATTER.META_IDENTITY);

    // 2. Desertion / Fear / Death
    if (matchIntent(input, ['跑', '逃', '撤退', '活下去', '会死吗', '怕死', '输', '投降', '回家', '不想死', '能走吗'])) return pick(GENERAL_CHATTER.DESERTION);

    // 3. Radio / HQ / Orders
    if (matchIntent(input, ['电报', '师部', '命令', '消息', '孙元良', '顾祝同', '蒋', '上级', '无线电', '信号'])) return pick(GENERAL_CHATTER.RADIO_INTEL);

    // 4. Bloodthirst / Aggression
    if (matchIntent(input, ['杀', '拼', '干', '弄死', '击退', '冲锋', '进攻', '灭', '宰', '打死', '反击', '血'])) return pick(GENERAL_CHATTER.BLOODTHIRST);

    // 5. Urgency / Speed
    if (matchIntent(input, ['快', '慢', '加速', '没时间', '速度', '抓紧', '磨蹭', '来不及', '迅速'])) return pick(GENERAL_CHATTER.URGENCY);

    // 6. Difficulty / Complaints
    if (matchIntent(input, ['太难', '猛', '守不住', '变态', '强', '怎么打', '太多', '受不了', '绝望', '不行'])) return pick(GENERAL_CHATTER.DIFFICULTY);

    // 7. Role Specific
    if (matchIntent(input, ['副官', '参谋', '报告', '长官'])) return pick(GENERAL_CHATTER.ADJUTANT);
    if (matchIntent(input, ['机枪', '连长', '重火力', '弹药', '马克沁', '扫射'])) return pick(GENERAL_CHATTER.HMG_TALK);
    if (matchIntent(input, ['大家', '弟兄', '士兵', '战士', '人', '咱们', '队伍', '一营'])) return pick(GENERAL_CHATTER.SOLDIERS_TALK);
    if (matchIntent(input, ['看', '观察', '环境', '周围', '河', '租界', '桥', '灯', '外面'])) return pick(GENERAL_CHATTER.ENVIRONMENT);

    // 8. Basic Needs / Emotional (Existing)
    if (matchIntent(input, ['饿', '吃', '水', '渴', '饭', '粮'])) return pick(GENERAL_CHATTER.HUNGRY);
    if (matchIntent(input, ['鬼子', '日军', '日本', '敌人', '仇'])) return pick(GENERAL_CHATTER.ENEMY);
    if (matchIntent(input, ['你好', '在吗', '喂', '嗨', '收到', '好'])) return pick(GENERAL_CHATTER.GREETING);
    
    // Default Fallback
    return pick(GENERAL_CHATTER.CONFUSED);
};

// ... Helper functions ...
const addMinutes = (timeStr: string, mins: number): string => {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + mins, 0, 0);
    return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
};

const checkNewDay = (current: string, next: string) => {
    const h1 = parseInt(current.split(':')[0]);
    const h2 = parseInt(next.split(':')[0]);
    return h2 < h1;
};

// ... (Existing combat functions kept same)
const getDefenseModifier = (stats: GameStats, calculatedStats: Partial<GameStats>) => {
    const squads = calculatedStats.hmgSquads || stats.hmgSquads;
    let destroyedCount = 0;
    // Check for disbanded (ammo depleted) or destroyed
    squads.forEach(s => {
        if (s.status === 'destroyed') destroyedCount++;
    });
    
    // Check active squads count for Ammo Depletion Debuff
    const activeCount = squads.filter(s => s.status === 'active').length;
    let modifier = 1.0 + (destroyedCount * 0.2);
    
    // If NO active HMG squads exist (all destroyed or disbanded), heavy penalty
    // This covers the case requested: "trigger 40% defense drop"
    if (activeCount === 0) {
        modifier += 0.4; 
    }

    return modifier;
};

const calculateScore = (stats: GameStats): { rank: string, text: string } => {
    const score = stats.soldiers * 10 + stats.fortificationLevel['一楼入口'] * 50 + stats.day * 100 + stats.enemiesKilled * 2;
    let rank = "尽忠职守";
    let text = "你完成了基本的守备任务，但在惨烈的战斗中损失惨重。";
    if (stats.soldiers > 300) { rank = "在此封神"; text = `奇迹！绝大多数弟兄都活了下来。击毙日军${stats.enemiesKilled}人。你的指挥艺术将被写进教科书！`; }
    else if (stats.soldiers > 200) { rank = "民族脊梁"; text = `你保全了主力部队，打出了国军的威风。击毙日军${stats.enemiesKilled}人。`; }
    else if (stats.soldiers > 100) { rank = "血战到底"; text = `虽然伤亡过半，但那面旗帜始终飘扬。击毙日军${stats.enemiesKilled}人。`; }
    return { rank, text };
};

// --- Main Logic ---

export const generateGameTurn = async (
  currentStats: GameStats,
  userCommand: string,
  historySummary: string
): Promise<GeminiResponse> => {
    
    let calculatedStats: Partial<GameStats> = {};
    let systemNotes: string[] = [];
    let eventTriggered: 'attack' | 'new_day' | 'none' | 'game_over' | 'victory' = "none";
    let visualEffect: 'shake' | 'heavy-damage' | 'none' = 'none';
    let attackLocation: Location | null = null;
    let narrativeParts: string[] = [];
    let dilemmaToTrigger: Dilemma | undefined = undefined;
    
    const cmd = userCommand.toLowerCase();
    
    // --- Start Game / Prologue ---
    if (cmd === "start_game") {
        // ... (Keep existing start game logic)
         calculatedStats.tutorialStep = 1; 
        calculatedStats.day = 0;
        calculatedStats.location = '一楼入口';
        calculatedStats.currentTime = "19:00"; 
        calculatedStats.triggeredEvents = []; 
        calculatedStats.usedTacticalCards = []; 
        
        return {
            narrative: "1937年10月26日，19:00。上海闸北，四行仓库。\n\n冷雨凄迷，苏州河水在黑暗中静静流淌。你刚刚接管防务，脚下的混凝土都在随着远处日军的炮火颤抖。\n\n“团附！团附！”副官满头大汗地冲过来，一把抓住你的袖子，“一楼大门的工事还没修好！沙袋不够厚，鬼子的坦克一炮就能轰开！如果现在不【加固一楼】，我们今晚都得死！”\n\n（新手引导：日军攻势迫在眉睫，请立即下令加固工事。）",
            updatedStats: calculatedStats,
            eventTriggered: 'none',
            enemyIntel: "侦察兵报告：日军正在集结步兵，似乎准备进行试探性进攻。"
        };
    }
    
    // --- Tutorial Logic (Simplified for brevity, assuming kept) ---
    // ... (Tutorial logic Step 1 & 2 goes here, exact same as before)
    if (currentStats.tutorialStep > 0 && currentStats.tutorialStep < 3) {
        if (currentStats.tutorialStep === 1) {
            if (cmd.includes('加固') || cmd.includes('修')) {
                 calculatedStats.tutorialStep = 2;
                 calculatedStats.fortificationLevel = { ...currentStats.fortificationLevel, '一楼入口': 2 };
                 calculatedStats.currentTime = "21:00";
                 return {
                     narrative: "你立刻组织人手搬运沙袋。人多力量大，大门很快被堵得严严实实。\n\n砰！砰！几发冷枪打在刚修好的沙袋上，溅起一片尘土。\n\n“好险...”副官擦了擦汗，“团附，还有个事。弟兄们刚撤下来，物资混乱。得赶紧【整理补给】（在对话框输入）！”",
                     updatedStats: calculatedStats,
                     eventTriggered: 'none',
                     visualEffect: 'shake'
                 };
            }
            return { narrative: "副官急得直跺脚：“团附！大门要紧啊！鬼子马上就到了！快下令【加固一楼】吧！”", updatedStats: {} };
        }
        if (currentStats.tutorialStep === 2) {
             if (cmd.includes('补给') || cmd.includes('物资') || cmd.includes('整') || cmd.includes('理')) {
                 calculatedStats.tutorialStep = 3;
                 calculatedStats.day = 1;
                 calculatedStats.currentTime = "08:00";
                 calculatedStats.siegeMeter = 20;
                 calculatedStats.fortificationLevel = { ...currentStats.fortificationLevel };
                 return {
                     narrative: "你下令清点物资。经过一夜的整理，成箱的手榴弹和子弹被整齐地码放在各个射击位旁。\n\n不知不觉，天亮了。\n\n10月27日，第一天。\n晨雾散去，日军的膏药旗在废墟中若隐若现。真正的恶战，开始了。",
                     updatedStats: calculatedStats,
                     eventTriggered: 'new_day',
                     enemyIntel: "侦察兵报告：日军步兵已展开，主要威胁为冷枪和轻型迫击炮。"
                 };
             }
             return { narrative: "“团附，请下令【整理补给】！”", updatedStats: {} };
        }
    }


    // --- DILEMMA RESOLUTION (Updated with New Events) ---
    if (cmd.startsWith("evt_resolve:")) {
        const parts = cmd.split(':');
        const evtId = parts[1];
        const optionIdx = parseInt(parts[2]);
        let resolveText = "";
        
        const prevEvents = calculatedStats.triggeredEvents || currentStats.triggeredEvents || [];
        if (!prevEvents.includes(evtId)) calculatedStats.triggeredEvents = [...prevEvents, evtId];
        
        // 1. Student Run
        if (evtId === 'student_run') {
            if (optionIdx === 0) { // Accept
                const died = Math.floor(Math.random() * 16); // 0-15
                calculatedStats.medkits = currentStats.medkits + 10;
                calculatedStats.soldiers = Math.max(0, currentStats.soldiers - died);
                resolveText = `【惨烈接应】你下令机枪全线开火压制！在弹雨中，学生们把药品扔进了窗口。但日军的掷弹筒也砸了过来...我们牺牲了 ${died} 名弟兄，换来了这批救命药。`;
                systemNotes.push(`获得急救包+10 | 阵亡${died}人`);
                visualEffect = 'heavy-damage';
            } else { // Reject
                calculatedStats.morale = Math.max(0, currentStats.morale - 3);
                resolveText = "你痛苦地闭上了眼睛，没有下令开火。眼睁睁看着那几个年轻的身影倒在桥头。仓库里一片死寂，弟兄们都在流泪。";
                systemNotes.push("士气-3");
            }
        } 
        // 2. Smuggler
        else if (evtId === 'smuggler_boat') {
            if (optionIdx === 0) {
                const isTrap = Math.random() < 0.5;
                if (isTrap) {
                    const died = 10 + Math.floor(Math.random() * 10);
                    calculatedStats.soldiers = Math.max(0, currentStats.soldiers - died);
                    resolveText = "【中计！】船刚靠岸，帆布揭开，露出的不是弹药，而是黑洞洞的机枪口！这是一次卑鄙的伏击！我们在河岸边丢下了十几具尸体才撤回来。";
                    systemNotes.push(`交易陷阱！阵亡${died}人`);
                    visualEffect = 'heavy-damage';
                } else {
                    calculatedStats.ammo = currentStats.ammo + 3000;
                    resolveText = "【惊险交易】对方收了“金条”，把几个沉重的木箱推上了岸。里面是崭新的重机枪子弹！这帮亡命徒虽然贪婪，但这批货真不错。";
                    systemNotes.push("获得弹药+3000");
                }
            } else {
                resolveText = "“滚！”你朝天鸣枪。小船迅速消失在迷雾中。";
            }
        }
        // 3. Defector
        else if (evtId === 'puppet_defector') {
             if (optionIdx === 0) {
                const isTrap = Math.random() < 0.3;
                if (isTrap) {
                     resolveText = "【自杀袭击】“板载！”那几个伪军突然拉响了身上的炸药包！巨大的爆炸震塌了仓库的一角。该死，他们是死士！";
                     const oldLv = currentStats.fortificationLevel['一楼入口'];
                     calculatedStats.fortificationLevel = { ...currentStats.fortificationLevel, '一楼入口': Math.max(0, oldLv - 1) };
                     systemNotes.push("工事受损！");
                     visualEffect = 'heavy-damage';
                } else {
                    calculatedStats.grenades = currentStats.grenades + 50;
                    resolveText = "他们是真的投诚。这几名伪军哭着跪在地上，把带来的手榴弹交给了我们。“中国人不打中国人！”";
                    systemNotes.push("获得手榴弹+50");
                }
             } else {
                 calculatedStats.morale = Math.max(0, currentStats.morale - 2);
                 resolveText = "为了安全起见，你下令射击。几具尸体倒在门外。或许他们是真的想回家，但战争容不下仁慈。";
             }
        }
        // 4. British Ceasefire (Previously missing logic)
        else if (evtId === 'brit_ceasefire') {
            if (optionIdx === 0) {
                calculatedStats.morale = Math.max(0, currentStats.morale - 5);
                calculatedStats.medkits = currentStats.medkits + 5;
                resolveText = "【妥协】你咬着牙下令：“朝南面打的枪，都给我停了！”英军对此表示赞赏，悄悄送来了一些急救药品。弟兄们有些憋屈。";
                systemNotes.push("士气-5 | 获得急救包+5");
            } else {
                calculatedStats.morale = Math.min(100, currentStats.morale + 5);
                resolveText = "【强硬】“这也是中国领土！”你拒绝了英军的要求。弟兄们听了很解气，但租界方向的探照灯开始频繁照射我们，侧翼暴露的风险增加了。";
                systemNotes.push("士气+5 | 侧翼威胁增加");
            }
        }

        return {
            narrative: resolveText,
            updatedStats: calculatedStats,
            eventTriggered: 'none'
        };
    }

    // --- Command Parsing & Action Logic ---
    let timeCost = 5; 
    let actionType = "idle";
    let siegeIncrease = 5; 
    
    // 1. FIRE RAID (Night Only) - Replaces Recon
    if (cmd.includes('突袭') || cmd.includes('夜袭') || cmd.includes('偷袭')) {
        const currentH = parseInt(currentStats.currentTime.split(':')[0]);
        // Time Check: 00:00 to 05:00
        if (currentH >= 0 && currentH < 5) {
            timeCost = 60; // 1 hour
            const isSuccess = Math.random() < 0.4; // 40% Success
            
            if (isSuccess) {
                // Success Rewards
                const died = Math.floor(Math.random() * 6); // 0-5
                const ammoGain = Math.random() > 0.3 ? Math.floor(Math.random() * 600) : 0;
                const medGain = Math.random() > 0.5 ? Math.floor(Math.random() * 30) : 0;
                
                calculatedStats.soldiers = Math.max(0, currentStats.soldiers - died);
                calculatedStats.ammo = currentStats.ammo + ammoGain;
                calculatedStats.medkits = currentStats.medkits + medGain;
                
                // Add Narrative
                narrativeParts.push(pick(RAID_SUCCESS_TEXTS));
                systemNotes.push(`阵亡${died}人`);
                if (ammoGain) systemNotes.push(`缴获弹药+${ammoGain}`);
                if (medGain) systemNotes.push(`缴获药品+${medGain}`);
                
                calculatedStats.morale = Math.min(100, currentStats.morale + 10);
            } else {
                // Fail Penalty
                const died = 10 + Math.floor(Math.random() * 11); // 10-20
                calculatedStats.soldiers = Math.max(0, currentStats.soldiers - died);
                calculatedStats.morale = Math.max(0, currentStats.morale - 15);
                
                narrativeParts.push(pick(RAID_FAIL_TEXTS));
                systemNotes.push(`行动失败！阵亡${died}人 | 士气大幅下降`);
                visualEffect = 'heavy-damage';
            }
            actionType = "raid"; // prevent idle check
        } else {
            narrativeParts.push("副官拦住了你：“团附！现在天还亮着，外面全是鬼子的狙击手和观察哨。现在出去就是送死！请等到深夜（00:00-05:00）再行动。”");
            actionType = "raid_blocked";
        }
    }
    // 2. Supply - BLOCKED (Replaced by Events)
    else if (cmd.includes('补给') || cmd.includes('物资') && !cmd.includes('整理')) {
        narrativeParts.push("通讯兵无奈地摇摇头：“团附，租界那边被封锁了，上面也没有空投计划。我们现在只能靠自己，或者等待突发的机会（随机事件）。”");
        actionType = "supply_blocked";
    }
    // 3. Move
    else if (cmd.includes('去') || cmd.includes('前往') || cmd.includes('撤')) {
        timeCost = 15;
        actionType = "move";
        if (cmd.includes('顶')) calculatedStats.location = '屋顶';
        else if (cmd.includes('二楼')) calculatedStats.location = '二楼阵地';
        else if (cmd.includes('一楼')) calculatedStats.location = '一楼入口';
        else if (cmd.includes('地下')) calculatedStats.location = '地下室';
    }
    // 4. Build / Fortify
    else if (cmd.includes('加固') || cmd.includes('修') || cmd.includes('工事')) {
        let targetLoc = currentStats.location;
        if (cmd.includes('一楼')) targetLoc = '一楼入口';
        else if (cmd.includes('二楼')) targetLoc = '二楼阵地';
        else if (cmd.includes('屋顶')) targetLoc = '屋顶';
        else if (cmd.includes('地下')) targetLoc = '地下室';

        const currentLevel = calculatedStats.fortificationLevel?.[targetLoc] ?? currentStats.fortificationLevel[targetLoc] ?? 0;
        
        if (currentLevel >= 3) {
            actionType = "build_max";
            timeCost = 5; 
        } else {
            if (currentStats.sandbags >= 200) {
                timeCost = 120; // 2 hours
                actionType = "build";
                const currentCount = currentStats.fortificationBuildCounts?.[targetLoc] || 0;
                const newCount = currentCount + 1;
                const newLevel = Math.floor(newCount / 2);
                
                calculatedStats.sandbags = currentStats.sandbags - 200;
                calculatedStats.fortificationBuildCounts = { ...currentStats.fortificationBuildCounts, [targetLoc]: newCount };
                calculatedStats.fortificationLevel = { ...currentStats.fortificationLevel, [targetLoc]: Math.min(3, newLevel) };
                
                // Fatigue Risk
                if (Math.random() < 0.3) {
                    const fatigueLoss = Math.floor(Math.random() * 6);
                    if (fatigueLoss > 0) {
                        const minM = currentStats.minMorale || 0;
                        calculatedStats.morale = Math.max(minM, currentStats.morale - fatigueLoss);
                        systemNotes.push(`劳累过度，士气 -${fatigueLoss}`);
                    }
                }
                systemNotes.push(`${targetLoc}工事进度+1`);
                siegeIncrease = 15; // Building attracts some attention
            } else {
                actionType = "fail";
                systemNotes.push(`沙袋不足！`);
            }
        }
    }
    // 5. Rest
    else if (cmd.includes('休息') || cmd.includes('睡') || cmd.includes('整顿')) {
        timeCost = 120; // 2 hours
        actionType = "rest";
        calculatedStats.morale = Math.min(100, currentStats.morale + 10);
        calculatedStats.health = Math.min(100, currentStats.health + 5);
        calculatedStats.lastRestTurn = currentStats.turnCount + 1;
        siegeIncrease = 35; 
        systemNotes.push("士气+10，阵地状态+5 (日军仇恨大幅上升!)");
    }
    // 6. Heal
    else if (cmd.includes('治疗') || cmd.includes('抢救') || cmd.includes('救') || cmd.includes('医')) {
        timeCost = 60; // 1 Hour
        const currentWounded = currentStats.wounded || 0;
        if (currentWounded > 0 && currentStats.medkits > 0) {
            actionType = "heal";
            const healPotential = Math.floor(Math.random() * 4) + 2; // 2 to 5
            const actualHeal = Math.min(currentWounded, currentStats.medkits, healPotential);
            if (actualHeal > 0) {
                calculatedStats.medkits = currentStats.medkits - actualHeal;
                calculatedStats.wounded = currentWounded - actualHeal;
                calculatedStats.soldiers = currentStats.soldiers + actualHeal;
                const moraleBoost = actualHeal * 2;
                calculatedStats.morale = Math.min(100, currentStats.morale + moraleBoost);
                calculatedStats.woundedTimer = Math.max(0, (currentStats.woundedTimer || 0) - (actualHeal * 90));
                systemNotes.push(`耗时1小时，救回${actualHeal}人，士气 +${moraleBoost}`);
                siegeIncrease = 10;
            } else {
                systemNotes.push("军医尽力了，但条件太差，没能救回任何人。");
            }
        } else {
            actionType = "heal_fail"; 
        }
    }
    // 7. Flag
    else if (cmd.includes('升旗')) {
        if (!currentStats.hasFlagRaised) {
            if (currentStats.location === '屋顶') {
                if (!currentStats.flagWarned) {
                    timeCost = 5;
                    calculatedStats.flagWarned = true;
                    actionType = "flag_warn";
                } else {
                    timeCost = 30;
                    actionType = "flag_success";
                    calculatedStats.hasFlagRaised = true;
                    calculatedStats.morale = Math.min(100, currentStats.morale + 30);
                    calculatedStats.minMorale = 30;
                    systemNotes.push("士气大幅提升 (+30)！士气下限提升至30！轰炸风险激增！");
                    siegeIncrease = 50; 
                }
            } else {
                narrativeParts.push("副官：‘长官，升旗必须去【屋顶】！’");
                timeCost = 5;
            }
        } else {
            narrativeParts.push("青天白日满地红已经在楼顶飘扬了。");
            timeCost = 5;
        }
    }
    // 8. Speech
    else if (['演讲', '训话', '鼓舞', '动员', '坚持', '顶住', '拼了', '万岁'].some(k => cmd.includes(k))) {
        timeCost = 60; // 1 hour
        actionType = "speech";
        calculatedStats.morale = Math.min(100, currentStats.morale + 3);
        systemNotes.push("士气 +3");
        siegeIncrease = 10;
    }
    
    // --- IMMERSIVE CHAT FALLBACK (If no command matched) ---
    if (actionType === 'idle') {
        const chatResponse = getConversationalResponse(cmd);
        narrativeParts.push(chatResponse);
        timeCost = 0; // Talking takes no time
    }

    // --- Time Update ---
    const nextTimeStr = addMinutes(currentStats.currentTime, timeCost);
    const totalMinutesPassed = timeCost;
    
    // --- FEATURE: SIEGE METER LOGIC ---
    const currentSiege = calculatedStats.siegeMeter ?? currentStats.siegeMeter ?? 0;
    let newSiege = Math.min(100, currentSiege + siegeIncrease);

    // --- Attack Check Logic ---
    let attackTriggered = false;
    let damageType = "INFANTRY";
    
    if (newSiege > 10 && actionType !== 'idle') { // Idle chat doesn't trigger attacks usually
        const riskRoll = Math.random() * 100;
        if (riskRoll < newSiege) {
            attackTriggered = true;
            newSiege = Math.max(0, newSiege - 50); 
            const currentH = parseInt(nextTimeStr.split(':')[0]);
            const isHeavyTime = currentH >= 8 && currentH <= 18;
            if (isHeavyTime && Math.random() < 0.6) damageType = "ARTILLERY";
            else damageType = "INFANTRY";
        }
    }
    
    calculatedStats.siegeMeter = newSiege;

    // Bombing (Separate check)
    const flagActive = calculatedStats.hasFlagRaised ?? currentStats.hasFlagRaised;
    const currentHour = parseInt(nextTimeStr.split(':')[0]);
    
    if (!attackTriggered && actionType !== 'idle') {
        if (flagActive) {
            if (currentHour >= 6 && currentHour <= 17 && Math.random() < 0.4) { 
                 attackTriggered = true;
                 damageType = "BOMBING";
            }
        } else {
            if (currentHour >= 8 && currentHour <= 16 && Math.random() < 0.25) {
                 attackTriggered = true;
                 damageType = "BOMBING";
            }
        }
    }

    // --- Wounded Passive Death ---
    const currentWoundedCount = calculatedStats.wounded ?? currentStats.wounded;
    let currentTimer = calculatedStats.woundedTimer ?? currentStats.woundedTimer;
    
    if (currentWoundedCount > 0) {
        currentTimer += totalMinutesPassed;
        if (currentTimer >= 720) {
            const deathToll = Math.floor(Math.random() * 5) + 1; 
            const actualDeaths = Math.min(currentWoundedCount, deathToll);
            if (actualDeaths > 0) {
                calculatedStats.wounded = currentWoundedCount - actualDeaths;
                const moraleLoss = actualDeaths;
                const minM = calculatedStats.minMorale ?? currentStats.minMorale ?? 0;
                calculatedStats.morale = Math.max(minM, (calculatedStats.morale ?? currentStats.morale) - moraleLoss);
                narrativeParts.push("\n\n" + pick(WOUNDED_DEATH_SCENES));
                systemNotes.push(`伤重不治: ${actualDeaths}人 (士气 -${moraleLoss})`);
                currentTimer = 660; 
            }
        }
    } else {
        currentTimer = 0;
    }
    calculatedStats.woundedTimer = currentTimer;


    // --- COMBAT RESOLUTION (Massive Update for Ammo Mechanics) ---
    if (attackTriggered) {
        eventTriggered = "attack";
        visualEffect = "shake";
        
        let bayonetMode = false;
        let ammoCheckSoldiers = calculatedStats.soldiers ?? currentStats.soldiers;
        let ammoCheckSquads = [...(calculatedStats.hmgSquads || currentStats.hmgSquads)];
        let currentAmmo = calculatedStats.ammo ?? currentStats.ammo;
        let currentMgAmmo = calculatedStats.machineGunAmmo ?? currentStats.machineGunAmmo;

        // --- NEW FEATURE: HMG AMMO DEPLETION LOGIC ---
        // If MG ammo is out, disband active HMG squads into infantry
        if (currentMgAmmo <= 0) {
            let disbandedCount = 0;
            let disbandedMen = 0;
            ammoCheckSquads = ammoCheckSquads.map(sq => {
                if (sq.status === 'active') {
                    disbandedCount++;
                    disbandedMen += sq.count;
                    return { ...sq, status: 'disbanded' }; // New Status
                }
                return sq;
            });

            if (disbandedCount > 0) {
                ammoCheckSoldiers += disbandedMen;
                calculatedStats.soldiers = ammoCheckSoldiers;
                calculatedStats.hmgSquads = ammoCheckSquads;
                narrativeParts.push("\n\n【重火力丧失】机枪弹已耗尽！机枪连的弟兄们红着眼拆下滚烫的枪管，拿起步枪加入了步兵防线！防御力大幅下降！");
                systemNotes.push(`机枪连转为步兵 (+${disbandedMen}人) | 防御力下降40%`);
                visualEffect = "heavy-damage";
            }
        }

        // --- NEW FEATURE: TOTAL AMMO DEPLETION (BAYONET CHARGE) ---
        if (currentAmmo <= 0 && currentMgAmmo <= 0) {
            bayonetMode = true;
            narrativeParts.push("\n\n" + pick(BAYONET_FIGHT_TEXTS));
        }

        const lv1 = calculatedStats.fortificationLevel?.['一楼入口'] ?? currentStats.fortificationLevel['一楼入口'];
        const lv2 = calculatedStats.fortificationLevel?.['二楼阵地'] ?? currentStats.fortificationLevel['二楼阵地'];
        const lvRoof = calculatedStats.fortificationLevel?.['屋顶'] ?? currentStats.fortificationLevel['屋顶'];
        
        const avgDef = (lv1 + lv2) / 2; 
        
        let baseDmg = 0;
        let fortDamageChance = 0;
        let targetFort: Location = '一楼入口';
        let ammoUsed = 0;
        let mgAmmoUsed = 0; 
        let grenadesUsed = 0;
        let enemyKillBase = 0;

        // Damage Calculation
        if (damageType === "BOMBING") {
             const baseBomb = lvRoof >= 3 ? 2 : (lvRoof === 2 ? 5 : 10);
             const multiplier = flagActive ? (2 + Math.random()) : 1;
             baseDmg = Math.floor((baseBomb * multiplier) * 1.5);
             narrativeParts.push("\n\n" + pick(ATTACK_TEXTS.BOMBING));
             targetFort = lvRoof <= 0 ? '二楼阵地' : '屋顶';
             fortDamageChance = lvRoof <= 0 ? 0.5 : (flagActive ? 0.3 : 0.2);
             if (baseDmg > 8) visualEffect = "heavy-damage";
             ammoUsed = Math.floor(Math.random() * 200);
        } else {
             // Artillery / Infantry
            fortDamageChance = bayonetMode ? 0.6 : 0.3; // Double fort damage chance in bayonet mode
            targetFort = Math.random() > 0.5 ? '一楼入口' : '二楼阵地';

            if (damageType === "ARTILLERY") {
                const smallScaleBase = (4 - Math.floor(avgDef)) * 3; 
                const multiplier = 3 + Math.random() * 2; 
                baseDmg = Math.floor((smallScaleBase * multiplier) * 1.5);
                narrativeParts.push("\n\n" + pick(ATTACK_TEXTS.ARTILLERY));
                if (baseDmg > 15) visualEffect = "heavy-damage";
                enemyKillBase = 5 + Math.floor(Math.random() * 10);
                ammoUsed = 500 + (enemyKillBase * 50) + Math.floor(Math.random() * 1000); 
                grenadesUsed = 5 + Math.floor(Math.random() * 10);
            } else {
                const defFactor = Math.floor(avgDef); 
                const maxDmg = [15, 10, 5, 2];
                baseDmg = Math.floor((Math.random() * maxDmg[defFactor]) * 1.5);
                
                if (!bayonetMode) narrativeParts.push("\n\n" + pick(ATTACK_TEXTS.INFANTRY));
                
                enemyKillBase = 10 + Math.floor(Math.random() * 30);
                ammoUsed = (enemyKillBase * 50) + Math.floor(Math.random() * 1000); 
                grenadesUsed = 40 + Math.floor(Math.random() * 40);
            }

            // No Heavy Firepower Penalty (Triple Ammo Usage)
            const activeSquads = (ammoCheckSquads).filter(s => s.status === 'active').length;
            if (activeSquads === 0 && !bayonetMode) {
                 ammoUsed *= 3; // Triple ammo usage
            }

            // HMG Logic (Only if not bayonet mode and ammo exists)
            if (!bayonetMode && activeSquads > 0) {
                const baseConsumptionPerSquad = 600 + Math.floor(Math.random() * 600);
                mgAmmoUsed = baseConsumptionPerSquad * activeSquads;
                
                // HMG Casualties
                const targetIdx = ammoCheckSquads.findIndex(s => s.status === 'active');
                if (targetIdx !== -1) {
                    const hmgCasualties = Math.floor(Math.random() * 3) + 1; 
                    const sq = ammoCheckSquads[targetIdx];
                    const newCount = Math.max(0, sq.count - hmgCasualties);
                    if (newCount === 0) {
                        ammoCheckSquads[targetIdx] = { ...sq, count: 0, status: 'destroyed' };
                        systemNotes.push(`【噩耗】${sq.name}全员阵亡！士气 -10，防御下降20%`);
                        calculatedStats.morale = Math.max(0, (calculatedStats.morale ?? currentStats.morale) - 10);
                        visualEffect = "heavy-damage"; 
                    } else {
                        ammoCheckSquads[targetIdx] = { ...sq, count: newCount };
                    }
                }
                calculatedStats.hmgSquads = ammoCheckSquads;
            }
        }
        
        attackLocation = targetFort; 

        // Apply Resource Consumption
        if (!bayonetMode) {
            calculatedStats.ammo = Math.max(0, (calculatedStats.ammo ?? currentStats.ammo) - ammoUsed);
            calculatedStats.machineGunAmmo = Math.max(0, (calculatedStats.machineGunAmmo ?? currentStats.machineGunAmmo) - mgAmmoUsed); 
        } else {
            // Bayonet mode doesn't use bullets, just life and grenades
            ammoUsed = 0; 
            mgAmmoUsed = 0;
            grenadesUsed = grenadesUsed * 2; // Use more grenades in desperation
        }

        calculatedStats.grenades = Math.max(0, currentStats.grenades - grenadesUsed);

        // Feedback Text for Resources
        if (ammoUsed > 0) systemNotes.push(`消耗弹药 ${ammoUsed}发`);
        if (mgAmmoUsed > 0) systemNotes.push(`消耗机枪弹 ${mgAmmoUsed}发`);
        if (grenadesUsed > 0) systemNotes.push(`消耗手榴弹 ${grenadesUsed}枚`);
        
        // Kill Counter
        if (enemyKillBase > 0) {
            const defBonus = 1 + (avgDef * 0.2);
            const activeSquads = (calculatedStats.hmgSquads || currentStats.hmgSquads).filter(s => s.status === 'active').length;
            const hmgBonus = activeSquads * 0.5;
            let actualEnemiesKilled = Math.floor(enemyKillBase * (defBonus + hmgBonus));
            
            // Bayonet kills are raw and brutal (less efficient than guns but impactful)
            if (bayonetMode) actualEnemiesKilled = Math.floor(enemyKillBase * 1.2); 

            const prevKills = calculatedStats.enemiesKilled ?? currentStats.enemiesKilled ?? 0;
            calculatedStats.enemiesKilled = prevKills + actualEnemiesKilled;
            const moraleGain = Math.min(20, Math.floor(Math.random() * 10) + 1 + Math.floor(actualEnemiesKilled / 5));
            calculatedStats.morale = Math.min(100, (calculatedStats.morale ?? currentStats.morale) + moraleGain);
            
            systemNotes.push(`击毙日军 ${actualEnemiesKilled}人`);
            systemNotes.push(`士气 +${moraleGain} (杀敌)`); // Explicit morale gain text
        }

        // Casualties
        const defMod = getDefenseModifier(currentStats, calculatedStats);
        let totalDamageMen = Math.floor(baseDmg * defMod);
        
        // BAYONET MODE CASUALTY OVERRIDE
        if (bayonetMode) {
            // Small scale (1-20) or Large scale (10-40) roughly mapped
            if (damageType === 'ARTILLERY') {
                 // Represents large scale assault
                 totalDamageMen = 10 + Math.floor(Math.random() * 31); // 10-40
            } else {
                 totalDamageMen = 1 + Math.floor(Math.random() * 20); // 1-20
            }
        }

        const currentWounded = calculatedStats.wounded ?? currentStats.wounded;
        const currentHealthy = calculatedStats.soldiers ?? currentStats.soldiers;
        let deathsFromWounded = 0;
        let deathsFromHealthy = 0;
        let injuriesFromHealthy = 0;

        if (totalDamageMen > 0) {
            const targetWoundedDeaths = Math.ceil(totalDamageMen * 0.8);
            deathsFromWounded = Math.min(currentWounded, targetWoundedDeaths);
            const remainingDamage = totalDamageMen - deathsFromWounded;
            deathsFromHealthy = Math.floor(remainingDamage * 0.4);
            injuriesFromHealthy = remainingDamage - deathsFromHealthy;
            deathsFromHealthy = Math.min(currentHealthy, deathsFromHealthy);
            injuriesFromHealthy = Math.min(currentHealthy - deathsFromHealthy, injuriesFromHealthy);
        }

        calculatedStats.wounded = currentWounded - deathsFromWounded + injuriesFromHealthy;
        calculatedStats.soldiers = currentHealthy - deathsFromHealthy - injuriesFromHealthy;
        calculatedStats.health = Math.max(0, (calculatedStats.health ?? currentStats.health) - (injuriesFromHealthy > 0 ? 5 : 0));

        if (deathsFromWounded > 0) {
            narrativeParts.push("\n\n" + pick(WOUNDED_DEATH_SCENES));
            systemNotes.push(`重伤员阵亡: ${deathsFromWounded}人`);
        }
        if (deathsFromHealthy > 0) {
             const flavor = pick(DEATH_FLAVOR_TEMPLATES).replace('{name}', pick(SOLDIER_NAMES)).replace('{origin}', pick(SOLDIER_ORIGINS));
             narrativeParts.push(`\n\n【阵亡名单】${flavor}`);
             systemNotes.push(`战斗兵员: 阵亡${deathsFromHealthy} 伤${injuriesFromHealthy}`);
        } else if (injuriesFromHealthy > 0) {
             systemNotes.push(`战斗兵员: 伤${injuriesFromHealthy}`);
        }
        
        const totalDeaths = deathsFromWounded + deathsFromHealthy;
        if (totalDeaths > 0) {
            const moraleLoss = totalDeaths * 2;
            calculatedStats.morale = Math.max(0, (calculatedStats.morale ?? currentStats.morale) - moraleLoss);
            systemNotes.push(`士气 -${moraleLoss} (阵亡)`); // Explicit morale loss text
        }

        // Fortification Damage
        if (Math.random() < fortDamageChance) {
            const currentLv = calculatedStats.fortificationLevel?.[targetFort] ?? currentStats.fortificationLevel[targetFort];
            if (currentLv > 0) {
                const newLv = currentLv - 1;
                calculatedStats.fortificationLevel = { ...(calculatedStats.fortificationLevel || currentStats.fortificationLevel), [targetFort]: newLv };
                calculatedStats.fortificationBuildCounts = { ...(calculatedStats.fortificationBuildCounts || currentStats.fortificationBuildCounts), [targetFort]: newLv * 2 };
                narrativeParts.push("\n\n" + pick(FORT_DAMAGE_SCENES));
                systemNotes.push(`${targetFort}工事降级`);
                visualEffect = "shake";
            }
        }
    }

    // --- Mutiny Check ---
    const finalMorale = calculatedStats.morale ?? currentStats.morale;
    if (finalMorale < 30 && Math.random() < 0.4) {
        narrativeParts.push("\n\n" + pick(MUTINY_SCENES));
        const lost = Math.floor(Math.random() * 10) + 5; 
        calculatedStats.soldiers = Math.max(0, (calculatedStats.soldiers ?? currentStats.soldiers) - lost);
        systemNotes.push(`因士气崩溃损失兵力: ${lost}人`);
        visualEffect = "heavy-damage";
    }

    // --- Finalize State ---
    if (!calculatedStats.currentTime) calculatedStats.currentTime = nextTimeStr; 
    if (checkNewDay(currentStats.currentTime, nextTimeStr)) {
        calculatedStats.day = currentStats.day + 1;
        eventTriggered = "new_day";
        systemNotes.push(`进入第 ${calculatedStats.day} 天`);
    }

    // --- FEATURE: TACTICAL CARD SPAWN ---
    if (!currentStats.activeTacticalCard && Math.random() < 0.1 && !calculatedStats.isGameOver) {
        const used = calculatedStats.usedTacticalCards || currentStats.usedTacticalCards || [];
        const availableCards = TACTICAL_CARDS.filter(c => !used.includes(c.id));
        if (availableCards.length > 0) {
            const newCard = pick(availableCards);
            calculatedStats.activeTacticalCard = newCard;
            calculatedStats.usedTacticalCards = [...used, newCard.id];
            systemNotes.push(`【战机】触发特殊事件：${newCard.title}`);
        }
    }

    // --- Game Over Logic ---
    const finalSoldiers = calculatedStats.soldiers ?? currentStats.soldiers;
    const finalHealth = calculatedStats.health ?? currentStats.health;
    const finalDay = calculatedStats.day ?? currentStats.day;
    
    if (finalSoldiers < 20 || finalHealth <= 0) {
        calculatedStats.isGameOver = true;
        calculatedStats.gameResult = 'defeat';
        eventTriggered = 'game_over';
        visualEffect = 'heavy-damage';
        const report = calculateScore({ ...currentStats, ...calculatedStats });
        calculatedStats.finalRank = report.rank;
        narrativeParts.push(`\n\n【战役结束】\n最终军衔评价：${report.rank}\n${report.text}`);
    } else if (finalDay > 5) {
        calculatedStats.isGameOver = true;
        calculatedStats.gameResult = 'victory';
        eventTriggered = 'victory';
        const report = calculateScore({ ...currentStats, ...calculatedStats });
        calculatedStats.finalRank = report.rank;
        narrativeParts.push(`\n\n【战役胜利】\n最终军衔评价：${report.rank}\n${report.text}`);
    }

    // --- Generate Output Text ---
    let responseText = "";
    if (actionType === 'move') responseText = pick(COMMAND_RESPONSES.MOVE).replace('{dest}', calculatedStats.location || "");
    else if (actionType === 'build') responseText = pick(BUILD_SCENES);
    else if (actionType === 'build_max') responseText = pick(COMMAND_RESPONSES.BUILD_MAX);
    else if (actionType === 'rest') responseText = pick(COMMAND_RESPONSES.REST);
    else if (actionType === 'heal') responseText = pick(HEAL_SUCCESS_SCENES);
    else if (actionType === 'heal_fail') responseText = pick(COMMAND_RESPONSES.HEAL_FAIL);
    else if (actionType === 'flag_warn') responseText = pick(COMMAND_RESPONSES.FLAG_WARN);
    else if (actionType === 'flag_success') responseText = pick(COMMAND_RESPONSES.FLAG_SUCCESS);
    else if (actionType === 'speech') responseText = pick(SPEECH_SCENES);
    
    if (responseText) narrativeParts.unshift(responseText);
    
    if (systemNotes.length > 0) {
        narrativeParts.push(`\n\n【战报】${systemNotes.join("；")}`);
    }
    
    // --- TRIGGER NEW SUPPLY DILEMMAS (Instead of button) ---
    // Only trigger if not game over, not under attack.
    if (!calculatedStats.isGameOver && !eventTriggered.includes('attack') && Math.random() < 0.2) {
        const alreadyTriggered = calculatedStats.triggeredEvents || currentStats.triggeredEvents || [];
        const potentialDilemmas = ALL_DILEMMAS.filter(d => !alreadyTriggered.includes(d.id));
        if (potentialDilemmas.length > 0) {
            dilemmaToTrigger = pick(potentialDilemmas);
        }
    }

    return {
        narrative: narrativeParts.join(""),
        updatedStats: calculatedStats,
        eventTriggered,
        visualEffect,
        attackLocation, 
        dilemma: dilemmaToTrigger,
        enemyIntel: ENEMY_INTEL_BY_DAY[Math.min(finalDay, 6)]
    };
};

export const generateAdvisorResponse = async (
    chatHistory: { role: string; text: string }[],
    userQuestion: string
): Promise<string> => {
    // Advisor logic remains same, can be enhanced later if needed
    const q = userQuestion.toLowerCase();
    await new Promise(res => setTimeout(res, 800)); 

    if (q.includes('伤') || q.includes('救')) return "长官，现在药品紧缺，我们一次只能救治几个人（耗时1小时）。如果伤员超过12小时未得到救治，将会因伤重死亡！这会严重打击士气。";
    if (q.includes('旗')) return "升旗是把双刃剑。虽然能极大提升士气，但升旗后的屋顶将成为日军轰炸的重点目标（工事损毁率极高）。升旗后士气将永久不会低于30。";
    if (q.includes('机枪')) return "机枪连队有独立的编制。如果一支连队全员阵亡，我们的防御网就会出现漏洞，受到的伤害会增加20%！轰炸炸不到他们，但要小心步兵和重炮。";
    if (q.includes('士气')) return "士气如果低于30，部队可能会发生哗变或大规模逃亡。请务必保持士气！升旗是锁定士气下限的唯一方法。";
    if (q.includes('突袭') || q.includes('夜袭')) return "夜袭（火力突袭）只能在00:00-05:00之间进行。这是一场赌博，成功可以抢回弹药药品，失败则会损兵折将。请慎重决策！";
    if (q.includes('补给')) return "现在的环境下，我们无法主动请求补给。只能等待机会——比如学生送药、江湖交易或者伪军投诚。";
    
    return "长官，请指示。我们誓死追随您！";
};
