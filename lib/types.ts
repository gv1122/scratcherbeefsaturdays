export interface Pairing {
  a: string; 
  b: string | null; 
}

export interface MatchState {
  pairings: Pairing[];
  generatedAt: number;
}

export interface SubmitResponse {
  ok: boolean;
  handle?: string;
  error?: string;
}

export interface MatchResponse {
  registered: boolean;
  handle?: string;
  opponent?: string | null;
  generatedAt?: number;
}
