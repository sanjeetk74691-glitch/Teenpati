
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export type HandRank = 
  | 'Trail'          // Three of a kind
  | 'Pure Sequence'  // Straight Flush
  | 'Sequence'       // Straight
  | 'Color'          // Flush
  | 'Pair'           // Two of a kind
  | 'High Card';     // Highest card

export interface EvaluationResult {
  rank: HandRank;
  score: number; // For tie-breaking
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  hand: Card[];
  isSeen: boolean;
  isPacked: boolean;
  currentBet: number;
  isDealer?: boolean;
}

export enum GameStage {
  Lobby = 'Lobby',
  Dealing = 'Dealing',
  Betting = 'Betting',
  Showdown = 'Showdown',
  GameOver = 'GameOver'
}

export interface ChatMessage {
  role: 'system' | 'ai' | 'player';
  text: string;
}
