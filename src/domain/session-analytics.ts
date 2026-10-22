import type { FeelingToken, DesireToken } from "./types";

export interface RawDialogueLink {
  fromSeat: number;
  toSeat: number;
  fromWord: string;
  toWord: string;
  timestamp: number;
}

export interface DialogueHandoff {
  fromSpeaker: number;
  toSpeaker: number;
  fromPhrase: string;
  toPhrase: string;
  timestamp: number;
  isSpeakerSwitch: boolean;
}

export interface SpeakerMetric {
  speakerId: number;
  turnCount: number;
  phrases: string[];
  feelingsCount: Record<string, number>;
  averageValence: number;
}

export interface TrajectoryPoint {
  timestamp: number;
  phrase: string;
  speakerId: number;
  family: string;
  valence: number;
  kind: "feeling" | "desire";
}

export interface SessionAnalyticsReport {
  totalTurns: number;
  activeSpeakersCount: number;
  speakers: SpeakerMetric[];
  handoffs: DialogueHandoff[];
  trajectory: TrajectoryPoint[];
}

export function buildSessionAnalytics(
  rawLinks: RawDialogueLink[] = [],
  feelings: FeelingToken[] = [],
  desires: DesireToken[] = []
): SessionAnalyticsReport {
  // 1. Build unified chronological trajectory
  const trajectory: TrajectoryPoint[] = [];

  for (const f of feelings) {
    trajectory.push({
      timestamp: f.timestamp,
      phrase: f.text || f.lemma,
      speakerId: f.speakerId,
      family: f.family,
      valence: f.valence,
      kind: "feeling",
    });
  }

  for (const d of desires) {
    trajectory.push({
      timestamp: d.timestamp,
      phrase: d.text,
      speakerId: d.speakerId,
      family: "желание",
      valence: 0.5,
      kind: "desire",
    });
  }

  trajectory.sort((a, b) => a.timestamp - b.timestamp);

  // 2. Aggregate speaker metrics
  const speakerMap = new Map<number, SpeakerMetric>();

  for (const point of trajectory) {
    let sm = speakerMap.get(point.speakerId);
    if (!sm) {
      sm = {
        speakerId: point.speakerId,
        turnCount: 0,
        phrases: [],
        feelingsCount: {},
        averageValence: 0,
      };
      speakerMap.set(point.speakerId, sm);
    }

    sm.turnCount++;
    sm.phrases.push(point.phrase);
    sm.feelingsCount[point.family] = (sm.feelingsCount[point.family] || 0) + 1;
  }

  // Compute average valence per speaker
  for (const sm of speakerMap.values()) {
    const speakerPoints = trajectory.filter((p) => p.speakerId === sm.speakerId);
    const sumValence = speakerPoints.reduce((acc, p) => acc + p.valence, 0);
    sm.averageValence = speakerPoints.length > 0 ? Number((sumValence / speakerPoints.length).toFixed(2)) : 0;
  }

  // 3. Dialogue handoffs
  const handoffs: DialogueHandoff[] = rawLinks.map((l) => ({
    fromSpeaker: l.fromSeat,
    toSpeaker: l.toSeat,
    fromPhrase: l.fromWord,
    toPhrase: l.toWord,
    timestamp: l.timestamp,
    isSpeakerSwitch: l.fromSeat !== l.toSeat,
  }));

  return {
    totalTurns: trajectory.length,
    activeSpeakersCount: speakerMap.size,
    speakers: Array.from(speakerMap.values()).sort((a, b) => a.speakerId - b.speakerId),
    handoffs,
    trajectory,
  };
}

export function getPersistedSessionAnalytics(): SessionAnalyticsReport {
  if (typeof window === "undefined" || !window.localStorage) {
    return buildSessionAnalytics();
  }

  try {
    const rawLinks: RawDialogueLink[] = JSON.parse(
      localStorage.getItem("salon_presence_links") || "[]"
    );
    const persistedState = JSON.parse(
      localStorage.getItem("salon_presence_state") || "{}"
    );
    const feelings: FeelingToken[] = persistedState?.session?.feelings || [];
    const desires: DesireToken[] = persistedState?.session?.desires || [];

    return buildSessionAnalytics(rawLinks, feelings, desires);
  } catch (err) {
    console.warn("[getPersistedSessionAnalytics] Failed to parse analytics:", err);
    return buildSessionAnalytics();
  }
}
