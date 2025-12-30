
import { GameStats } from './types';

export const INITIAL_STATS: GameStats = {
  location: '一楼入口',
  
  // 兵力重组：总数414
  // 步兵: 354
  // 机枪连: 60 (2支队伍 x 30人)
  soldiers: 354, 
  wounded: 0, 
  woundedTimer: 0, 
  
  hmgSquads: [
      { name: '机枪一连', location: '一楼入口', count: 30, status: 'active' },
      { name: '机枪二连', location: '二楼阵地', count: 30, status: 'active' }
  ],

  morale: 80, // Start slightly lower for tutorial growth
  minMorale: 0, 
  health: 100,
  day: 0, // Start at Day 0 (Prologue)
  currentTime: "19:00", 
  turnCount: 0,
  lastRestTurn: 0,
  
  // New Mechanics Init
  tutorialStep: 0,
  siegeMeter: 10, // Starts low
  activeTacticalCard: null,
  
  // 资源修正
  ammo: 45000,          
  machineGunAmmo: 18000,
  grenades: 1000,       
  sandbags: 4500,       
  medkits: 40,          

  hasFlagRaised: false,
  flagWarned: false,
  enemiesKilled: 0,
  triggeredEvents: [],
  usedTacticalCards: [],
  
  // 步兵分布 
  soldierDistribution: {
    '一楼入口': 140, 
    '二楼阵地': 180, 
    '屋顶': 10,      
    '地下室': 24     
  },

  fortificationLevel: {
    '一楼入口': 1,
    '二楼阵地': 1,
    '屋顶': 0,
    '地下室': 3
  },
  
  fortificationBuildCounts: {
    '一楼入口': 2,
    '二楼阵地': 2,
    '屋顶': 0,
    '地下室': 6 
  },

  isGameOver: false,
  gameResult: 'ongoing'
};

export const SYSTEM_INSTRUCTION = `
你是一个纯文字互动冒险游戏《孤军：四行1937》的“游戏叙述者”。
玩家扮演谢晋元团附，指挥国军第88师524团一营（共414人）。
`;
