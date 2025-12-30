
export type Location = '地下室' | '一楼入口' | '二楼阵地' | '屋顶';

export interface HmgSquad {
    name: string; // "机枪一连"
    location: Location | '待命'; 
    count: number; // Specific number of men (starts at 30)
    status: 'active' | 'destroyed' | 'disbanded'; // Added 'disbanded' for ammo depletion
}

export interface DilemmaOption {
    label: string;
    actionCmd: string; // The command string to send to backend
    riskText?: string;
}

export interface Dilemma {
    id: string;
    title: string;
    description: string;
    options: DilemmaOption[];
}

export interface TacticalCard {
    id: string;
    title: string;
    description: string;
    effectText: string;
    actionCmd: string;
    color: string; // 'gold' | 'red' | 'blue'
}

export interface GameStats {
  location: Location;
  soldiers: number; // Healthy Riflemen/Infantry
  wounded: number;  
  woundedTimer: number; 
  
  // Specialized Squads (The 60 men extracted)
  hmgSquads: HmgSquad[];

  morale: number; // 0-100
  minMorale: number; // Morale floor
  health: number; // 0-100 
  day: number;
  currentTime: string; 
  turnCount: number;
  lastRestTurn: number;
  
  // NEW MECHANICS
  tutorialStep: number; // 0: Start, 1: Need Fortify, 2: Need Supply, 3: Done
  siegeMeter: number; // 0-100, triggers attack when full
  activeTacticalCard?: TacticalCard | null;

  // Resources
  ammo: number; 
  machineGunAmmo: number; 
  grenades: number; 
  sandbags: number; 
  medkits: number; 

  // State
  hasFlagRaised: boolean;
  flagWarned: boolean; 
  enemiesKilled: number; // NEW: Track total enemies killed
  triggeredEvents: string[]; // NEW: Track IDs of unique events that have occurred
  usedTacticalCards: string[]; // NEW: Track used tactical cards
  
  soldierDistribution: Record<string, number>;

  // Fortifications
  fortificationLevel: Record<string, number>; 
  fortificationBuildCounts: Record<string, number>; 

  isGameOver: boolean;
  gameResult: 'ongoing' | 'victory' | 'defeat';
  
  // End Game Report
  finalRank?: string;
  wavesRepelled?: number;
}

export interface GameLog {
  id: string;
  sender: 'system' | 'user';
  text: string;
  isTyping?: boolean;
}

export interface GeminiResponse {
  narrative: string;
  updatedStats: Partial<GameStats>;
  eventTriggered?: 'attack' | 'new_day' | 'none' | 'game_over' | 'victory';
  visualEffect?: 'shake' | 'heavy-damage' | 'none'; 
  attackLocation?: Location | null; // NEW: Indicates which specific map node is under attack
  dilemma?: Dilemma; 
  enemyIntel?: string; 
}

export interface SaveData {
  stats: GameStats;
  logs: GameLog[];
  savedAt: number;
}

export interface SaveSlotMeta {
    id: number;
    isEmpty: boolean;
    savedAt: number;
    day?: number;
    soldiers?: number;
    location?: string;
}
