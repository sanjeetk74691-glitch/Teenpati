
import { Card, Rank, Suit, EvaluationResult, HandRank } from '../types';

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: RANK_VALUES[rank] });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const evaluateHand = (hand: Card[]): EvaluationResult => {
  if (hand.length !== 3) return { rank: 'High Card', score: 0 };

  const values = hand.map(c => c.value).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);
  
  const isTrail = values[0] === values[1] && values[1] === values[2];
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  
  // Straight handling (including A-2-3 as a sequence, though usually A is highest)
  let isSequence = false;
  if (values[0] + 1 === values[1] && values[1] + 1 === values[2]) {
    isSequence = true;
  } else if (values[0] === 2 && values[1] === 3 && values[2] === 14) {
    // Special case for A-2-3
    isSequence = true;
  }

  const isPureSequence = isSequence && isFlush;
  const isPair = values[0] === values[1] || values[1] === values[2] || values[0] === values[2];

  // Scoring for tie-breakers: (Rank Multiplier * 10000) + Highest card score
  if (isTrail) return { rank: 'Trail', score: 60000 + values[2] };
  if (isPureSequence) return { rank: 'Pure Sequence', score: 50000 + values[2] };
  if (isSequence) return { rank: 'Sequence', score: 40000 + values[2] };
  if (isFlush) return { rank: 'Color', score: 30000 + values[2] };
  if (isPair) {
    const pairValue = values[0] === values[1] ? values[0] : values[1];
    return { rank: 'Pair', score: 20000 + pairValue };
  }
  return { rank: 'High Card', score: 10000 + values[2] };
};

export const getRankLabel = (rank: HandRank): string => {
  switch (rank) {
    case 'Trail': return 'Set / Trail';
    case 'Pure Sequence': return 'Pure Sequence';
    case 'Sequence': return 'Sequence';
    case 'Color': return 'Color / Flush';
    case 'Pair': return 'Pair';
    case 'High Card': return 'High Card';
    default: return '';
  }
};
