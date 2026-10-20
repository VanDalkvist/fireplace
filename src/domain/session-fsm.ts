import type {
  SessionPhase,
  Participant,
  SessionState,
  FeelingToken,
  DesireToken,
} from "./types";

const PHASE_SEQUENCE: SessionPhase[] = [
  "silence",
  "feelings",
  "desires",
  "completion",
];

export function createInitialState(seatCount: number = 12): SessionState {
  const count = Math.max(1, seatCount);
  const participants: Participant[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    seatNumber: i + 1,
    role: "guest",
    isSpeaking: i === 0,
    hasPassed: false,
    isHost: i === 0,
  }));

  return {
    phase: "silence",
    participants,
    activeSpeakerId: 1,
    feelings: [],
    desires: [],
    connections: [],
    isListening: true,
    isMuted: false,
  };
}

export function advancePhase(state: SessionState): SessionState {
  const currentIndex = PHASE_SEQUENCE.indexOf(state.phase);
  const nextPhase =
    currentIndex < PHASE_SEQUENCE.length - 1
      ? PHASE_SEQUENCE[currentIndex + 1]
      : state.phase;

  return {
    ...state,
    phase: nextPhase,
  };
}

export function setPhase(
  state: SessionState,
  phase: SessionPhase
): SessionState {
  return {
    ...state,
    phase,
  };
}

export function nextSpeaker(state: SessionState): SessionState {
  if (state.participants.length === 0) return state;

  const currentSpeakerId = state.activeSpeakerId ?? 1;
  const currentIdx = state.participants.findIndex((p) => p.id === currentSpeakerId);
  const nextIdx = (currentIdx + 1) % state.participants.length;
  const nextId = state.participants[nextIdx].id;

  const updatedParticipants = state.participants.map((p) => ({
    ...p,
    isSpeaking: p.id === nextId,
  }));

  return {
    ...state,
    activeSpeakerId: nextId,
    participants: updatedParticipants,
  };
}

export function passTurn(
  state: SessionState,
  speakerId: number
): SessionState {
  const updatedParticipants = state.participants.map((p) =>
    p.id === speakerId ? { ...p, hasPassed: true } : p
  );

  return nextSpeaker({
    ...state,
    participants: updatedParticipants,
  });
}

export function addFeelingToken(
  state: SessionState,
  token: FeelingToken
): SessionState {
  return {
    ...state,
    feelings: [...state.feelings, token],
  };
}

export function addDesireToken(
  state: SessionState,
  token: DesireToken
): SessionState {
  return {
    ...state,
    desires: [...state.desires, token],
  };
}
