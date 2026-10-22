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

export function calculatePhyllotaxisAngle(index: number): number {
  const GOLDEN_ANGLE = 2.3999632; // ~137.5 degrees
  return index * GOLDEN_ANGLE - Math.PI / 2;
}

export function createInitialState(seatCount: number = 0): SessionState {
  if (seatCount <= 0) {
    return {
      phase: "silence",
      participants: [],
      activeSpeakerId: null,
      feelings: [],
      desires: [],
      connections: [],
      isListening: true,
      isMuted: false,
    };
  }

  const participants: Participant[] = Array.from({ length: seatCount }, (_, i) => ({
    id: i + 1,
    seatNumber: i + 1,
    role: "guest",
    isSpeaking: i === 0,
    hasPassed: false,
    isHost: i === 0,
    angle: calculatePhyllotaxisAngle(i),
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

export function ensureParticipant(state: SessionState, speakerId: number): SessionState {
  if (state.participants.some((p) => p.id === speakerId)) {
    return state;
  }

  const idx = state.participants.length;
  const newParticipant: Participant = {
    id: speakerId,
    seatNumber: speakerId,
    role: idx === 0 ? "light" : "guest",
    isSpeaking: true,
    hasPassed: false,
    isHost: idx === 0,
    angle: calculatePhyllotaxisAngle(idx),
  };

  // Enforce single speaker invariant: mute previous speakers (AP-013)
  const updatedParticipants = state.participants.map((p) => ({
    ...p,
    isSpeaking: false,
  }));

  return {
    ...state,
    participants: [...updatedParticipants, newParticipant],
    activeSpeakerId: speakerId,
  };
}

export function resetParticipants(state: SessionState): SessionState {
  return {
    ...state,
    participants: [],
    activeSpeakerId: null,
    feelings: [],
    desires: [],
    connections: [],
  };
}

export function setSpeaker(
  state: SessionState,
  speakerId: number
): SessionState {
  const ensured = ensureParticipant(state, speakerId);
  return {
    ...ensured,
    activeSpeakerId: speakerId,
    participants: ensured.participants.map((p) => ({
      ...p,
      isSpeaking: p.id === speakerId,
    })),
  };
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
