import { describe, it, expect } from 'vitest';
import { buildSessionAnalytics, formatAnalyticsAsMarkdown, type RawDialogueLink } from '../src/domain/session-analytics';
import type { FeelingToken, DesireToken } from '../src/domain/types';

describe('SessionAnalytics', () => {
  it('aggregates dialogue handoffs, speaker turns, and emotional trajectory', () => {
    const rawLinks: RawDialogueLink[] = [
      { fromSeat: 1, toSeat: 7, fromWord: "создать бота", toWord: "давать доступ к системе", timestamp: 10000 },
      { fromSeat: 7, toSeat: 7, fromWord: "давать доступ к системе", toWord: "бэкенд для групп", timestamp: 13000 },
      { fromSeat: 7, toSeat: 3, fromWord: "бэкенд для групп", toWord: "делишься опытом", timestamp: 17000 },
    ];

    const feelings: FeelingToken[] = [
      { id: 'f1', text: 'создать бота', lemma: 'создать бота', family: 'интерес', valence: 0.8, arousal: 0.5, intensity: 1, speakerId: 1, timestamp: 10000 },
      { id: 'f2', text: 'давать доступ к системе', lemma: 'давать доступ к системе', family: 'интерес', valence: 0.7, arousal: 0.5, intensity: 1, speakerId: 7, timestamp: 13000 },
      { id: 'f3', text: 'бэкенд для групп', lemma: 'бэкенд для групп', family: 'ясность', valence: 0.6, arousal: 0.5, intensity: 1, speakerId: 7, timestamp: 15000 },
      { id: 'f4', text: 'делишься опытом', lemma: 'делишься опытом', family: 'открытость', valence: 0.7, arousal: 0.5, intensity: 1, speakerId: 3, timestamp: 17000 },
    ];

    const desires: DesireToken[] = [];

    const analytics = buildSessionAnalytics(rawLinks, feelings, desires);

    // 1. Total turns & participants
    expect(analytics.totalTurns).toBe(4);
    expect(analytics.activeSpeakersCount).toBe(3); // Speakers 1, 7, 3

    // 2. Speaker 7 metrics
    const spk7 = analytics.speakers.find((s) => s.speakerId === 7);
    expect(spk7).toBeDefined();
    expect(spk7?.turnCount).toBe(2);
    expect(spk7?.phrases).toContain("давать доступ к системе");
    expect(spk7?.phrases).toContain("бэкенд для групп");

    // 3. Dialogue handoffs
    expect(analytics.handoffs.length).toBe(3);
    const handoffTo3 = analytics.handoffs.find((h) => h.toSpeaker === 3);
    expect(handoffTo3?.fromSpeaker).toBe(7);
    expect(handoffTo3?.fromPhrase).toBe("бэкенд для групп");
    expect(handoffTo3?.toPhrase).toBe("делишься опытом");
    expect(handoffTo3?.isSpeakerSwitch).toBe(true);

    // 4. Emotional trajectory
    expect(analytics.trajectory.length).toBe(4);
    expect(analytics.trajectory[0].family).toBe("интерес");
    expect(analytics.trajectory[3].family).toBe("открытость");
  });

  it('formats session analytics as clean markdown summary', () => {
    const rawLinks: RawDialogueLink[] = [
      { fromSeat: 1, toSeat: 7, fromWord: "создать бота", toWord: "давать доступ", timestamp: 10000 },
    ];
    const feelings: FeelingToken[] = [
      { id: 'f1', text: 'создать бота', lemma: 'создать бота', family: 'интерес', valence: 0.8, arousal: 0.5, intensity: 1, speakerId: 1, timestamp: 10000 },
      { id: 'f2', text: 'давать доступ', lemma: 'давать доступ', family: 'тепло', valence: 0.7, arousal: 0.5, intensity: 1, speakerId: 7, timestamp: 13000 },
    ];
    const analytics = buildSessionAnalytics(rawLinks, feelings, []);
    const md = formatAnalyticsAsMarkdown(analytics);

    expect(md).toContain("# Аналитика круга присутствия");
    expect(md).toContain("Спикер 1");
    expect(md).toContain("создать бота");
    expect(md).toContain("Спикер 7");
    expect(md).toContain("давать доступ");
    expect(md).toContain("Диалоговые переходы");
  });
});
