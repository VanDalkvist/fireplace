export type SessionPhase = "silence" | "feelings" | "desires" | "completion";

export type ParticipantRole = "guest" | "listener" | "weaver" | "light";

export interface Participant {
  id: number;
  seatNumber: number;
  role: ParticipantRole;
  isSpeaking: boolean;
  hasPassed: boolean;
  isHost: boolean;
  angle?: number;
}

export interface FeelingToken {
  id: string;
  text: string;
  lemma: string;
  family: string;
  valence: number;
  arousal: number;
  intensity: number;
  speakerId: number;
  timestamp: number;
}

export interface DesireToken {
  id: string;
  text: string;
  object: string;
  who: string;
  speakerId: number;
  timestamp: number;
}

export interface ConnectionEdge {
  id: string;
  sourceTokenId: string;
  targetTokenId: string;
  strength: number;
  kind: "sequential" | "resonance";
}

export interface SessionState {
  phase: SessionPhase;
  participants: Participant[];
  activeSpeakerId: number | null;
  feelings: FeelingToken[];
  desires: DesireToken[];
  connections: ConnectionEdge[];
  isListening: boolean;
  isMuted: boolean;
}
