
import React, { useState, useEffect, useRef, useCallback } from 'react';
import StatsPanel from './components/StatsPanel';
import TacticalMap from './components/TacticalMap';
import Typewriter from './components/Typewriter';
import StartScreen from './components/StartScreen';
import SaveLoadModal from './components/SaveLoadModal';
import AdvisorChat from './components/AdvisorChat';
import QuickActions from './components/QuickActions'; 
import DilemmaModal from './components/DilemmaModal';
import TacticalCardDisplay from './components/TacticalCardDisplay'; 
import GameOverModal from './components/GameOverModal'; // NEW
import { GameStats, GameLog, GeminiResponse, SaveData, SaveSlotMeta, Dilemma, Location } from './types';
import { INITIAL_STATS } from './constants';
import { generateGameTurn } from './services/geminiService';

const SAVE_INDEX_KEY = 'lone_army_save_index';
const SAVE_SLOT_PREFIX = 'lone_army_slot_';
const MAX_SLOTS = 50;
const API_TIMEOUT_MS = 90000; 

const App: React.FC = () => {
  // Scene State
  const [view, setView] = useState<'MENU' | 'GAME'>('MENU');
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showSaveLoadModal, setShowSaveLoadModal] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false); 
  const [modalMode, setModalMode] = useState<'save' | 'load'>('save');
  const [saveSlots, setSaveSlots] = useState<SaveSlotMeta[]>([]);
  
  // Game Event State
  const [currentDilemma, setCurrentDilemma] = useState<Dilemma | null>(null);
  const [enemyIntel, setEnemyIntel] = useState<string>("日军动向不明...");
  const [attackLocation, setAttackLocation] = useState<Location | null>(null);

  // Visual Effects State
  const [visualEffect, setVisualEffect] = useState<'none' | 'shake' | 'heavy-damage'>('none');
  
  // Menu Internal UI State
  const [confirmExit, setConfirmExit] = useState(false);

  // Game State
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMap, setShowMap] = useState(true); 
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);

  // --- Visual Effect Handler ---
  useEffect(() => {
    if (visualEffect !== 'none') {
        const timer = setTimeout(() => {
            setVisualEffect('none');
        }, 600); 
        return () => clearTimeout(timer);
    }
  }, [visualEffect]);

  // --- Save System Logic ---

  useEffect(() => {
    refreshSaveSlots();
  }, []);

  const refreshSaveSlots = () => {
    try {
        const indexJson = localStorage.getItem(SAVE_INDEX_KEY);
        let meta: SaveSlotMeta[] = [];

        if (indexJson) {
            meta = JSON.parse(indexJson);
        }

        const fullSlots: SaveSlotMeta[] = [];
        for (let i = 0; i < MAX_SLOTS; i++) {
            const existing = meta.find(m => m.id === i);
            if (existing) {
                fullSlots.push(existing);
            } else {
                fullSlots.push({ id: i, isEmpty: true, savedAt: 0 });
            }
        }
        setSaveSlots(fullSlots);
    } catch (e) {
        console.error("Error refreshing save slots", e);
    }
  };

  const hasAnySave = () => saveSlots.some(s => !s.isEmpty);

  const handleSaveToSlot = (slotId: number) => {
    try {
        const saveData: SaveData = {
            stats,
            logs,
            savedAt: Date.now()
        };
        
        localStorage.setItem(SAVE_SLOT_PREFIX + slotId, JSON.stringify(saveData));

        const newMetaItem: SaveSlotMeta = {
            id: slotId,
            isEmpty: false,
            savedAt: saveData.savedAt,
            day: stats.day,
            soldiers: stats.soldiers,
            location: stats.location
        };

        const newSlots = [...saveSlots];
        newSlots[slotId] = newMetaItem;
        
        localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(newSlots.filter(s => !s.isEmpty)));
        
        setSaveSlots(newSlots);
        setShowSaveLoadModal(false);
        setShowGameMenu(false); 
        alert("战报已归档！");
    } catch (e) {
        console.error("Save failed", e);
        alert("保存失败：存储空间可能已满。");
    }
  };

  const handleLoadFromSlot = (slotId: number) => {
    try {
        const json = localStorage.getItem(SAVE_SLOT_PREFIX + slotId);
        if (!json) return;

        const data: SaveData = JSON.parse(json);
        setStats(data.stats);
        setLogs(data.logs.map(l => ({ ...l, isTyping: false })));
        setView('GAME');
        setShowSaveLoadModal(false);
        setShowGameMenu(false);
    } catch (e) {
        console.error("Load failed", e);
        alert("档案读取失败，文件可能已损毁。");
    }
  };

  const openSaveModal = () => {
    refreshSaveSlots();
    setModalMode('save');
    setShowSaveLoadModal(true);
  };

  const openLoadModal = () => {
    refreshSaveSlots();
    setModalMode('load');
    setShowSaveLoadModal(true);
  };

  // --- Auto Scroll ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, view, isLoading]);

  // Focus Input
  useEffect(() => {
    if (view === 'GAME' && !stats.isGameOver && !showSaveLoadModal && !showGameMenu && !showAdvisor && !currentDilemma) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [view, stats.isGameOver, showSaveLoadModal, showGameMenu, showAdvisor, currentDilemma]);

  // --- Helper: API Call with Timeout ---
  const callAiWithTimeout = async (
    currentStats: GameStats, 
    command: string, 
    history: string
  ): Promise<GeminiResponse> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const apiCall = generateGameTurn(currentStats, command, history);
    
    const timeout = new Promise<GeminiResponse>((resolve) => {
        setTimeout(() => {
            resolve({
                narrative: "【系统提示】通讯线路连接超时 (90秒)。请检查网络或重试。",
                updatedStats: {},
                eventTriggered: "none"
            });
        }, API_TIMEOUT_MS);
    });

    return Promise.race([apiCall, timeout]);
  };

  // --- Game Control Logic ---

  const handleNewGame = async () => {
    setStats(INITIAL_STATS);
    setLogs([]);
    setView('GAME');
    setShowGameMenu(false);
    setIsLoading(true);
    setCurrentDilemma(null);
    setAttackLocation(null);
    
    try {
        const startResponse = await callAiWithTimeout(INITIAL_STATS, "START_GAME", "");
        handleAiResponse(startResponse);
    } catch (e) {
        console.error(e);
        setLogs([{ id: 'error', sender: 'system', text: '初始化失败，系统异常。' }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleExitRequest = () => {
    setConfirmExit(true);
  };

  const handleConfirmExit = () => {
    setView('MENU');
    setShowGameMenu(false);
    setConfirmExit(false);
    // CRITICAL FIX: Reset isGameOver so modal disappears
    setStats(prev => ({ ...prev, isGameOver: false }));
    refreshSaveSlots();
  };

  // --- Core Game Logic ---

  const handleAiResponse = useCallback((response: GeminiResponse) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'system',
        text: response.narrative,
        isTyping: true, 
      },
    ]);

    if (response.visualEffect && response.visualEffect !== 'none') {
        setVisualEffect(response.visualEffect);
    }

    if (response.enemyIntel) {
        setEnemyIntel(response.enemyIntel);
    }
    
    if (response.attackLocation) {
        setAttackLocation(response.attackLocation);
    }

    if (response.dilemma) {
        setTimeout(() => {
            setCurrentDilemma(response.dilemma!);
        }, 1500);
    }

    if (response.updatedStats) {
      setStats((prev) => {
        const newStats = { ...prev, ...response.updatedStats };
        
        if (typeof newStats.soldiers === 'number') newStats.soldiers = Math.floor(Math.max(0, newStats.soldiers));
        if (typeof newStats.morale === 'number') newStats.morale = Math.floor(Math.min(100, Math.max(0, newStats.morale)));
        if (typeof newStats.health === 'number') newStats.health = Math.floor(Math.min(100, Math.max(0, newStats.health)));
        if (typeof newStats.ammo === 'number') newStats.ammo = Math.floor(Math.max(0, newStats.ammo));
        if (typeof newStats.sandbags === 'number') newStats.sandbags = Math.floor(Math.max(0, newStats.sandbags));
        
        if (response.updatedStats.fortificationLevel) {
             newStats.fortificationLevel = { ...prev.fortificationLevel, ...response.updatedStats.fortificationLevel };
        }
        
        if (response.updatedStats.fortificationBuildCounts) {
             newStats.fortificationBuildCounts = { ...prev.fortificationBuildCounts, ...response.updatedStats.fortificationBuildCounts };
        }

        if (response.updatedStats.soldierDistribution) {
             const dist = { ...prev.soldierDistribution, ...response.updatedStats.soldierDistribution };
             Object.keys(dist).forEach(k => dist[k] = Math.floor(dist[k]));
             newStats.soldierDistribution = dist;
        }
        
        newStats.turnCount = (prev.turnCount || 0) + 1;
        return newStats;
      });
    }
  }, []);

  const handleCommand = async (e?: React.FormEvent, directCommand?: string, displayLabel?: string) => {
    if (e) e.preventDefault();
    
    const userCmd = directCommand || input.trim();
    const logText = displayLabel || userCmd;

    if (isComposing.current || !userCmd || isLoading || stats.isGameOver) return;

    if (!directCommand) setInput('');
    setIsLoading(true);

    setLogs((prev) => [
      ...prev.map(l => ({ ...l, isTyping: false })),
      { id: Date.now().toString(), sender: 'user', text: `> ${logText}` },
    ]);

    try {
        const historySummary = logs
            .filter(l => l.text && l.id !== 'error')
            .slice(-15) 
            .map(l => `[${l.sender === 'user' ? 'CMD' : 'LOG'}] ${l.text.substring(0, 150)}...`) 
            .join("\n");

        const response = await callAiWithTimeout(stats, userCmd, historySummary);
        handleAiResponse(response);
    } catch (error) {
        console.error("Game Error:", error);
        setLogs(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: "系统错误，请重试。", isTyping: false }]);
    } finally {
        setIsLoading(false);
        if (!directCommand) setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDilemmaChoice = async (actionCmd: string, label: string) => {
      setCurrentDilemma(null);
      await handleCommand(undefined, actionCmd.toLowerCase(), label);
  };
  
  // Tactical Card Execution
  const handleTacticalCardExecute = async (cmd: string, title: string) => {
      // FIX: Clear the card immediately so it can't be clicked again
      setStats(prev => ({...prev, activeTacticalCard: null}));
      await handleCommand(undefined, cmd, title);
  };

  const finishTyping = useCallback((id: string) => {
    setLogs(prev => prev.map(log => log.id === id ? { ...log, isTyping: false } : log));
  }, []);

  const containerEffectClass = 
    visualEffect === 'shake' ? 'effect-shake' : 
    visualEffect === 'heavy-damage' ? 'effect-shake effect-damage' : '';

  return (
    <div className={`flex flex-col h-[100dvh] max-w-4xl mx-auto bg-[#111] text-[#ddd] overflow-hidden shadow-2xl border-x border-neutral-800 relative ${containerEffectClass}`}>
      
      {/* Modals */}
      {showSaveLoadModal && (
          <SaveLoadModal 
            mode={modalMode} 
            slots={saveSlots} 
            onClose={() => setShowSaveLoadModal(false)}
            onSelectSlot={(id) => {
                if (modalMode === 'save') {
                    if (saveSlots[id].isEmpty || window.confirm(`确认覆盖 存档 ${id+1} 吗？`)) {
                        handleSaveToSlot(id);
                    }
                } else {
                    if (saveSlots[id].isEmpty) return;
                    handleLoadFromSlot(id);
                }
            }}
          />
      )}
      
      {currentDilemma && (
          <DilemmaModal dilemma={currentDilemma} onChoice={(cmd) => {
              // Find the label for the command
              const opt = currentDilemma.options.find(o => o.actionCmd === cmd);
              handleDilemmaChoice(cmd, opt?.label || "做出选择");
          }} />
      )}
      
      {stats.activeTacticalCard && (
          <TacticalCardDisplay 
              card={stats.activeTacticalCard} 
              onExecute={(cmd) => handleTacticalCardExecute(cmd, stats.activeTacticalCard?.title || "")} 
          />
      )}

      {/* NEW: Game Over Modal */}
      {stats.isGameOver && (
          <GameOverModal 
            stats={stats} 
            onRestart={handleNewGame} 
            onExit={handleConfirmExit} 
          />
      )}
      
      <AdvisorChat isOpen={showAdvisor} onClose={() => setShowAdvisor(false)} />

      {view === 'MENU' ? (
          <StartScreen 
            onNewGame={handleNewGame} 
            onOpenLoadMenu={openLoadModal} 
            hasSaves={hasAnySave()} 
          />
      ) : (
        <>
            {showGameMenu && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-lg shadow-2xl w-full max-w-sm relative">
                        <h3 className="text-xl font-bold text-neutral-200 mb-6 text-center border-b border-neutral-800 pb-2">战时菜单</h3>
                        {!confirmExit ? (
                            <div className="space-y-3">
                                <button onClick={() => setShowGameMenu(false)} className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors">
                                    返回前线
                                </button>
                                <button onClick={openSaveModal} className="w-full py-3 bg-neutral-800 hover:bg-amber-900/30 text-amber-500 rounded border border-neutral-700 transition-colors">
                                    保存进度
                                </button>
                                <button onClick={handleExitRequest} className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded border border-red-900/30 transition-colors">
                                    撤出战场
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 text-center">
                                <p className="text-red-400 text-sm mb-4">确定要撤离吗？<br/>未归档的战报将会丢失。</p>
                                <button onClick={handleConfirmExit} className="w-full py-3 bg-red-800 hover:bg-red-700 text-white rounded font-bold">
                                    确认撤离
                                </button>
                                <button onClick={() => setConfirmExit(false)} className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded">
                                    取消
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <StatsPanel stats={stats} enemyIntel={enemyIntel} />

            <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-1 flex justify-center z-10 relative shrink-0">
                <button 
                    onClick={() => setShowMap(!showMap)}
                    className="text-[10px] text-neutral-500 hover:text-neutral-300 uppercase tracking-widest flex items-center gap-1"
                >
                    {showMap ? '▼ 隐藏地图' : '▲ 显示地图'}
                </button>
            </div>

            {/* Map Container: Restricted height with scroll to prevent blocking chat */}
            {showMap && (
                <div className="shrink-0 border-b border-neutral-800 bg-[#0a0a0a] max-h-[30vh] overflow-y-auto custom-scrollbar">
                    <TacticalMap stats={stats} onAction={(cmd) => handleCommand(undefined, cmd)} attackLocation={attackLocation} />
                </div>
            )}

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth font-mono min-h-0"
                onClick={() => {
                    const lastLog = logs[logs.length - 1];
                    if (lastLog?.isTyping) finishTyping(lastLog.id);
                }}
            >
                {logs.map((log) => (
                <div 
                    key={log.id} 
                    className={`flex flex-col ${log.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                    <div className={`max-w-[95%] sm:max-w-[90%] ${
                    log.sender === 'user' 
                        ? 'text-neutral-400 font-mono text-sm border-l-2 border-neutral-600 pl-3' 
                        : 'text-gray-300 text-sm sm:text-base leading-loose'
                    }`}>
                    {log.sender === 'system' && log.isTyping ? (
                        <Typewriter 
                            text={log.text} 
                            speed={15} 
                            onComplete={() => finishTyping(log.id)} 
                        />
                    ) : (
                        <span className="whitespace-pre-wrap">{log.text}</span>
                    )}
                    </div>
                </div>
                ))}

                {isLoading && (
                <div className="flex items-center gap-2 text-neutral-500 animate-pulse text-xs font-mono">
                    <span>[通讯连接中...]</span>
                    <button 
                        onClick={() => setIsLoading(false)} 
                        className="ml-2 text-[10px] underline text-red-500/50 hover:text-red-500"
                        title="如果长时间无响应，点击此处强制取消等待"
                    >
                        (强制重置)
                    </button>
                </div>
                )}
            </div>

            <div className="bg-[#1a1a1a] p-2 border-t border-neutral-700 z-20 relative flex flex-col gap-2 shrink-0">
                
                {/* MOVED: Advisor and Menu Buttons to Bottom Area */}
                {!stats.isGameOver && (
                    <div className="flex justify-between items-center px-1 mb-1">
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setShowAdvisor(true)}
                                className="flex items-center gap-1 px-3 py-1 text-xs text-green-500/90 hover:text-green-400 bg-neutral-900 rounded border border-green-900/50 transition-colors"
                            >
                                <span>☍</span> 战地顾问
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                setShowGameMenu(true);
                                setConfirmExit(false);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-700 transition-colors"
                        >
                            <span>☰</span> 菜单
                        </button>
                    </div>
                )}

                {/* Quick Actions Row */}
                {!stats.isGameOver && (
                    <QuickActions 
                        onAction={(cmd) => handleCommand(undefined, cmd)} 
                        disabled={isLoading || !!currentDilemma} 
                        stats={stats}
                    />
                )}

                <form onSubmit={(e) => handleCommand(e)} className="relative flex gap-2">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono select-none">
                        {'>'}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onCompositionStart={() => isComposing.current = true}
                        onCompositionEnd={() => isComposing.current = false}
                        placeholder={stats.isGameOver ? "连接断开..." : (currentDilemma ? "等待抉择..." : (isLoading ? "通讯等待中..." : "下达命令..."))}
                        disabled={stats.isGameOver || !!currentDilemma}
                        autoComplete="off"
                        autoCorrect="off"
                        className="w-full bg-neutral-900 text-white pl-8 pr-4 py-2.5 rounded-md border border-neutral-700 focus:border-neutral-500 focus:outline-none font-mono placeholder-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || stats.isGameOver || !!currentDilemma}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-md border border-neutral-700 font-medium transition-colors disabled:opacity-50 text-xs whitespace-nowrap"
                    >
                        {isLoading ? '...' : '发送'}
                    </button>
                </form>
            </div>
        </>
      )}
    </div>
  );
};

export default App;
