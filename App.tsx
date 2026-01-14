
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Player, 
  GameStage, 
  Card, 
  ChatMessage 
} from './types';
import { 
  createDeck, 
  shuffleDeck, 
  evaluateHand, 
  getRankLabel 
} from './utils/cardUtils';
import { getDealerCommentary } from './services/geminiService';
import { 
  Trophy, 
  Coins, 
  User, 
  Eye, 
  EyeOff, 
  Send, 
  ChevronRight,
  Info,
  Settings,
  History
} from 'lucide-react';

// --- Constants ---
const BOOT_AMOUNT = 100;
const INITIAL_COINS = 10000;

const App: React.FC = () => {
  // --- State ---
  const [gameStage, setGameStage] = useState<GameStage>(GameStage.Lobby);
  const [pot, setPot] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Player>({
    id: 'player-1',
    name: 'You',
    avatar: 'https://picsum.photos/seed/p1/100/100',
    coins: INITIAL_COINS,
    hand: [],
    isSeen: false,
    isPacked: false,
    currentBet: 0,
  });
  const [bots, setBots] = useState<Player[]>([
    {
      id: 'bot-1',
      name: 'Raj',
      avatar: 'https://picsum.photos/seed/b1/100/100',
      coins: 5000,
      hand: [],
      isSeen: false,
      isPacked: false,
      currentBet: 0,
    },
    {
      id: 'bot-2',
      name: 'Priya',
      avatar: 'https://picsum.photos/seed/b2/100/100',
      coins: 5000,
      hand: [],
      isSeen: false,
      isPacked: false,
      currentBet: 0,
    }
  ]);
  const [turnIndex, setTurnIndex] = useState(0); // 0 = Player, 1 = Bot1, 2 = Bot2
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Initial welcome message
    addMessage('ai', "Namaste! Welcome to Gothahula Teen Patti. I'm your host for tonight.");
  }, []);

  // --- Helpers ---
  const addMessage = (role: ChatMessage['role'], text: string) => {
    setMessages(prev => [...prev.slice(-10), { role, text }]);
  };

  const nextTurn = useCallback(() => {
    setTurnIndex(prev => (prev + 1) % 3);
  }, []);

  // --- Game Logic ---
  const startNewHand = () => {
    const newDeck = shuffleDeck(createDeck());
    const pHand = [newDeck[0], newDeck[1], newDeck[2]];
    const b1Hand = [newDeck[3], newDeck[4], newDeck[5]];
    const b2Hand = [newDeck[6], newDeck[7], newDeck[8]];

    setPlayer(prev => ({
      ...prev,
      hand: pHand,
      isSeen: false,
      isPacked: false,
      currentBet: BOOT_AMOUNT,
      coins: prev.coins - BOOT_AMOUNT
    }));

    setBots(prev => [
      { ...prev[0], hand: b1Hand, isSeen: false, isPacked: false, currentBet: BOOT_AMOUNT, coins: prev[0].coins - BOOT_AMOUNT },
      { ...prev[1], hand: b2Hand, isSeen: false, isPacked: false, currentBet: BOOT_AMOUNT, coins: prev[1].coins - BOOT_AMOUNT },
    ]);

    setDeck(newDeck.slice(9));
    setPot(BOOT_AMOUNT * 3);
    setGameStage(GameStage.Betting);
    setTurnIndex(0);
    setWinner(null);

    addMessage('ai', "The cards have been dealt. Luck is in the air!");
  };

  const handleAction = async (action: 'chaal' | 'pack' | 'blind' | 'show') => {
    if (gameStage !== GameStage.Betting) return;

    let betAmount = player.isSeen ? BOOT_AMOUNT * 2 : BOOT_AMOUNT;
    let lastAction = '';

    if (action === 'pack') {
      setPlayer(prev => ({ ...prev, isPacked: true }));
      lastAction = 'folded';
      addMessage('player', "I'm packing this one.");
    } else if (action === 'chaal' || action === 'blind') {
      if (action === 'chaal' && !player.isSeen) {
        // Force see if clicking chaal
        setPlayer(prev => ({ ...prev, isSeen: true }));
        betAmount = BOOT_AMOUNT * 2;
      }
      
      setPlayer(prev => ({ 
        ...prev, 
        coins: prev.coins - betAmount, 
        currentBet: prev.currentBet + betAmount 
      }));
      setPot(prev => prev + betAmount);
      lastAction = action;
    } else if (action === 'show') {
      determineWinner();
      return;
    }

    const comment = await getDealerCommentary(gameStage, pot + betAmount, player, lastAction);
    addMessage('ai', comment);

    // If only one player left who hasn't packed, they win immediately
    const activeBots = bots.filter(b => !b.isPacked);
    if (activeBots.length === 0 && action === 'pack') {
        // Technically player packed, bot wins
    } else {
        // Trigger bot moves logic after a delay...
        setTimeout(() => processBotTurns(), 1000);
    }
  };

  const processBotTurns = async () => {
    // Highly simplified bot logic for demo
    setBots(prev => prev.map(bot => {
        if (bot.isPacked) return bot;
        const isBetter = Math.random() > 0.3;
        if (isBetter) {
            const bet = bot.isSeen ? BOOT_AMOUNT * 2 : BOOT_AMOUNT;
            setPot(p => p + bet);
            return { ...bot, coins: bot.coins - bet, currentBet: bot.currentBet + bet };
        } else {
            return { ...bot, isPacked: true };
        }
    }));
    
    // Check if show is needed
    const activeCount = [player, ...bots].filter(p => !p.isPacked).length;
    if (activeCount <= 1) {
        determineWinner();
    }
  };

  const determineWinner = () => {
    const competitors = [player, ...bots].filter(p => !p.isPacked);
    if (competitors.length === 0) return;

    let bestPlayer = competitors[0];
    let bestScore = evaluateHand(competitors[0].hand).score;

    competitors.forEach(p => {
        const evalRes = evaluateHand(p.hand);
        if (evalRes.score > bestScore) {
            bestScore = evalRes.score;
            bestPlayer = p;
        }
    });

    setWinner(bestPlayer);
    setGameStage(GameStage.GameOver);
    
    if (bestPlayer.id === player.id) {
        setPlayer(prev => ({ ...prev, coins: prev.coins + pot }));
        addMessage('ai', `Congratulations! You won ${pot} coins with a ${getRankLabel(evaluateHand(player.hand).rank)}!`);
    } else {
        setBots(prev => prev.map(b => b.id === bestPlayer.id ? { ...b, coins: b.coins + pot } : b));
        addMessage('ai', `${bestPlayer.name} takes the pot of ${pot} coins.`);
    }
  };

  // --- Render Helpers ---
  const CardUI: React.FC<{ card: Card; hidden?: boolean }> = ({ card, hidden }) => (
    <div className={`w-16 h-24 md:w-24 md:h-36 rounded-lg shadow-xl flex flex-col items-center justify-center border-2 ${hidden ? 'bg-gradient-to-br from-red-800 to-red-950 border-gold-400' : 'bg-white border-gray-200'} transition-all transform hover:-translate-y-2`}>
      {hidden ? (
        <div className="text-white font-cinzel text-xl opacity-20">GP</div>
      ) : (
        <div className={`flex flex-col items-center ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'}`}>
          <div className="text-xl md:text-3xl font-bold">{card.rank}</div>
          <div className="text-2xl md:text-4xl">
            {card.suit === 'hearts' && '♥'}
            {card.suit === 'diamonds' && '♦'}
            {card.suit === 'clubs' && '♣'}
            {card.suit === 'spades' && '♠'}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-between text-white p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-300 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-yellow-400 rounded-full blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-yellow-400 to-yellow-600 p-2 rounded-lg shadow-lg">
            <Trophy className="text-emerald-900" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-cinzel font-bold text-yellow-400 tracking-wider">Gothahula</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Teen Patti Royal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
             <span className="text-xs text-emerald-300 font-bold uppercase">Balance</span>
             <div className="flex items-center gap-2 bg-emerald-900/50 px-4 py-1 rounded-full border border-yellow-500/30">
                <Coins className="text-yellow-400" size={16} />
                <span className="text-xl font-bold text-yellow-400">{player.coins.toLocaleString()}</span>
             </div>
          </div>
          <button onClick={() => setShowRules(true)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors">
            <Info size={24} className="text-emerald-300" />
          </button>
        </div>
      </header>

      {/* Main Table Area */}
      <main className="flex-1 w-full max-w-6xl relative flex flex-col items-center justify-center my-8">
        {/* The Casino Table */}
        <div className="relative w-full aspect-[16/10] md:aspect-[16/9] bg-gradient-to-b from-emerald-800 to-emerald-950 rounded-[100px] border-[12px] border-emerald-900 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-8 overflow-hidden">
          {/* Subtle Table Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          {/* Pot Area */}
          <div className="z-10 text-center mb-8">
            <div className="text-emerald-300 uppercase text-xs tracking-[0.3em] mb-1">Total Pot</div>
            <div className="flex items-center justify-center gap-3 bg-black/40 px-8 py-3 rounded-2xl border-2 border-yellow-500/50 shadow-2xl">
              <Coins className="text-yellow-400 animate-pulse" size={28} />
              <span className="text-4xl md:text-6xl font-cinzel font-bold text-white tracking-tighter">
                {pot.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Bots */}
          <div className="w-full flex justify-around items-start absolute top-12 left-0 px-12">
            {bots.map((bot) => (
              <div key={bot.id} className={`flex flex-col items-center gap-2 transition-opacity ${bot.isPacked ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                <div className={`relative p-1 rounded-full border-2 ${turnIndex === (bot.id === 'bot-1' ? 1 : 2) ? 'border-yellow-400 scale-110 shadow-lg' : 'border-emerald-600'}`}>
                  <img src={bot.avatar} className="w-16 h-16 rounded-full" alt={bot.name} />
                  {bot.isPacked && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-red-500 uppercase rotate-[-15deg]">Packed</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-emerald-200">{bot.name}</div>
                  <div className="text-[10px] text-yellow-500 font-mono">{bot.coins.toLocaleString()}</div>
                </div>
                {gameStage !== GameStage.Lobby && !bot.isPacked && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-10 bg-gradient-to-br from-red-800 to-red-950 rounded-sm border border-gold-400/30"></div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Player Hand */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full">
            <div className="flex items-center gap-4 mb-4">
              {player.hand.length > 0 ? (
                player.hand.map((card, i) => (
                  <CardUI key={i} card={card} hidden={!player.isSeen && gameStage !== GameStage.GameOver} />
                ))
              ) : (
                 gameStage === GameStage.Lobby && (
                   <button 
                    onClick={startNewHand}
                    className="group relative bg-gradient-to-b from-yellow-400 to-yellow-600 text-emerald-950 font-cinzel font-bold px-12 py-4 rounded-xl text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                   >
                     New Game
                     <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded-full animate-bounce">Play Free</div>
                   </button>
                 )
              )}
            </div>
            
            {player.hand.length > 0 && !player.isPacked && gameStage === GameStage.Betting && (
                <div className="text-center bg-black/20 backdrop-blur-sm px-4 py-1 rounded-full text-emerald-200 text-sm font-bold flex items-center gap-2">
                    {player.isSeen ? (
                        <><Eye size={16} /> Seen Player</>
                    ) : (
                        <><EyeOff size={16} /> Blind Player</>
                    )}
                </div>
            )}
          </div>

          {/* Winner Overlay */}
          {winner && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center animate-in fade-in duration-500 p-8">
              <div className="text-yellow-400 mb-2 font-cinzel text-xl tracking-widest uppercase">Champion</div>
              <img src={winner.avatar} className="w-32 h-32 rounded-full border-4 border-yellow-400 mb-4 shadow-[0_0_50px_rgba(250,204,21,0.4)]" alt="Winner" />
              <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-white mb-2">{winner.name} Wins!</h2>
              <div className="text-2xl text-yellow-500 font-bold mb-8 flex items-center gap-2">
                <Coins /> +{pot.toLocaleString()}
              </div>
              <button 
                onClick={startNewHand}
                className="bg-yellow-500 text-emerald-950 font-bold px-12 py-4 rounded-xl text-lg hover:bg-yellow-400 transition-all flex items-center gap-2"
              >
                Next Round <ChevronRight />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Controls / Chat Panel */}
      <footer className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 z-10 pb-4">
        {/* Chat / Commentary Section */}
        <div className="md:col-span-4 h-48 md:h-auto bg-emerald-950/60 backdrop-blur-md rounded-2xl border border-emerald-800 overflow-hidden flex flex-col shadow-2xl">
          <div className="bg-emerald-900/40 p-3 flex items-center justify-between border-b border-emerald-800/50">
            <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">Live Dealer Feed</span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  m.role === 'ai' ? 'bg-emerald-800 text-emerald-50 border-l-4 border-yellow-400' : 
                  m.role === 'player' ? 'bg-yellow-600 text-emerald-950 font-bold' : 
                  'bg-black/40 text-gray-400 italic'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls Section */}
        <div className="md:col-span-8 bg-emerald-900/30 backdrop-blur-md rounded-2xl p-6 border border-emerald-800 flex flex-col gap-6 shadow-2xl">
          <div className="flex flex-wrap gap-4 justify-center md:justify-end">
            {gameStage === GameStage.Betting && !player.isPacked && (
              <>
                <button 
                  onClick={() => handleAction('pack')}
                  className="px-6 py-3 rounded-xl border-2 border-red-500/50 text-red-400 font-bold hover:bg-red-500/10 transition-all uppercase tracking-widest text-sm"
                >
                  Pack
                </button>
                <button 
                  onClick={() => setPlayer(prev => ({ ...prev, isSeen: true }))}
                  disabled={player.isSeen}
                  className={`px-6 py-3 rounded-xl border-2 border-emerald-400/50 text-emerald-300 font-bold hover:bg-emerald-400/10 transition-all uppercase tracking-widest text-sm disabled:opacity-30 disabled:pointer-events-none`}
                >
                  See Cards
                </button>
                <div className="w-px h-10 bg-emerald-800 mx-2 hidden md:block"></div>
                <button 
                  onClick={() => handleAction(player.isSeen ? 'chaal' : 'blind')}
                  className="flex-1 max-w-[200px] px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                >
                  {player.isSeen ? 'Chaal' : 'Blind'} 
                  <span className="block text-[10px] opacity-70">
                    Pay {player.isSeen ? (BOOT_AMOUNT * 2) : BOOT_AMOUNT}
                  </span>
                </button>
                <button 
                  onClick={() => handleAction('show')}
                  className="px-8 py-3 bg-yellow-500 text-emerald-950 font-bold rounded-xl hover:bg-yellow-400 transition-all shadow-lg uppercase tracking-widest"
                >
                  Show
                </button>
              </>
            )}
            {gameStage === GameStage.Lobby && (
                 <div className="text-emerald-400 italic text-sm text-center w-full">
                    Gothahula Teen Patti: Where every hand is a story. Press New Game to begin.
                 </div>
            )}
            {gameStage === GameStage.GameOver && (
                <button 
                  onClick={startNewHand}
                  className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xl"
                >
                  Play Another Hand
                </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-emerald-500/50 uppercase tracking-[0.2em] font-bold">
            <div className="flex gap-4">
                <span>Fair Play Certified</span>
                <span>Random RNG Engine v4.2</span>
            </div>
            <span>No Real Money Involved</span>
          </div>
        </div>
      </footer>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-emerald-950 border-2 border-yellow-500/50 p-8 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative shadow-[0_0_100px_rgba(16,185,129,0.2)]">
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 text-emerald-300 hover:text-white"
            >
              ✕ Close
            </button>
            <h2 className="text-3xl font-cinzel font-bold text-yellow-400 mb-6 flex items-center gap-3">
                <Info className="text-yellow-500" /> Game Rules
            </h2>
            <div className="space-y-6 text-emerald-100 leading-relaxed">
              <section>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Rankings (Highest to Lowest)</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li><strong className="text-yellow-500">Trail (Set):</strong> Three cards of the same rank (e.g. A-A-A).</li>
                  <li><strong className="text-yellow-500">Pure Sequence:</strong> Three consecutive cards of the same suit.</li>
                  <li><strong className="text-yellow-500">Sequence:</strong> Three consecutive cards not in same suit.</li>
                  <li><strong className="text-yellow-500">Color (Flush):</strong> Three cards of the same suit but not in sequence.</li>
                  <li><strong className="text-yellow-500">Pair:</strong> Two cards of the same rank.</li>
                  <li><strong className="text-yellow-500">High Card:</strong> When no other combinations exist.</li>
                </ol>
              </section>
              <section>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Betting Rules</h3>
                <p className="text-sm">
                  The game starts with a <strong>Boot Amount</strong> collected from all players. Players can play <strong>Blind</strong> (without seeing their cards) or <strong>Seen</strong>. 
                  Seen players must bet double the amount of Blind players.
                </p>
              </section>
              <section className="bg-emerald-900/40 p-4 rounded-xl border border-emerald-800">
                <p className="text-xs text-emerald-400 italic">
                  Note: This is a social game using virtual coins. Real money gambling is not supported.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
