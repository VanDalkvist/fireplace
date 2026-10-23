import { describe, it, expect, beforeEach } from 'vitest';
import { SpeakerTurnBuffer } from '../src/domain/speaker-turn-buffer';

describe('SpeakerTurnBuffer', () => {
  let buffer: SpeakerTurnBuffer;

  beforeEach(() => {
    buffer = new SpeakerTurnBuffer(2200);
  });

  it('aggregates consecutive chunks from the same speaker within time gap', () => {
    const t0 = 10000;
    // Chunk 1 from Seat 7
    const res1 = buffer.feed("была на бэтенде для", 7, t0);
    expect(res1.shouldFlush).toBe(false);

    // Chunk 2 from Seat 7, 1200ms later
    const res2 = buffer.feed("большие группы контактов", 7, t0 + 1200);
    expect(res2.shouldFlush).toBe(false);

    // 2500ms pause triggers flush of aggregated phrase
    const flushed = buffer.checkTimeout(t0 + 1200 + 2500);
    expect(flushed).not.toBeNull();
    expect(flushed?.text).toBe("была на бэтенде для большие группы контактов");
    expect(flushed?.speakerSeat).toBe(7);
  });

  it('detects dangling prepositions and holds chunk even across normal pauses', () => {
    const t0 = 20000;
    const res = buffer.feed("оживить свою собственную как", 3, t0);
    expect(buffer.isDangling("оживить свою собственную как")).toBe(true);
    expect(res.shouldFlush).toBe(false);
  });

  it('flushes pending speaker turn immediately when speaker seat changes', () => {
    const t0 = 30000;
    buffer.feed("мы хотим создать инструмент", 5, t0);

    // Speaker changes to Seat 2 after 500ms
    const switchRes = buffer.feed("я согласен с этой идеей", 2, t0 + 500);
    expect(switchRes.flushedPrevious).not.toBeNull();
    expect(switchRes.flushedPrevious?.text).toBe("мы хотим создать инструмент");
    expect(switchRes.flushedPrevious?.speakerSeat).toBe(5);
  });

  it('maintains sliding window of recent conversational history', () => {
    buffer.commitCompletedTurn("создать бота для участников");
    buffer.commitCompletedTurn("давать доступ к системе");
    buffer.commitCompletedTurn("бэкенд для групп контактов");
    buffer.commitCompletedTurn("новые параметры задач");

    const history = buffer.getRecentHistory(3);
    expect(history.length).toBe(3);
    expect(history).toEqual([
      "давать доступ к системе",
      "бэкенд для групп контактов",
      "новые параметры задач",
    ]);
  });

  it('isolates history by speaker seat so one speaker context does not contaminate another', () => {
    buffer.commitCompletedTurn("я очень устал сегодня", 1);
    buffer.commitCompletedTurn("много задач навалилось", 1);

    // Requesting history for Seat 1
    expect(buffer.getRecentHistory(3, 1)).toEqual([
      "я очень устал сегодня",
      "много задач навалилось",
    ]);

    // Requesting history for Seat 2: should be isolated and empty
    expect(buffer.getRecentHistory(3, 2)).toEqual([]);

    // Now Seat 2 speaks
    buffer.commitCompletedTurn("а я наоборот полон сил", 2);
    expect(buffer.getRecentHistory(3, 2)).toEqual(["а я наоборот полон сил"]);
    expect(buffer.getRecentHistory(3, 1)).toEqual([
      "я очень устал сегодня",
      "много задач навалилось",
    ]);
  });

  it('clears all history and pending turns on clearHistory', () => {
    buffer.commitCompletedTurn("фраза из фазы чувств", 1);
    buffer.feed("незавершенная мысль", 1);

    buffer.clearHistory();

    expect(buffer.getRecentHistory(3, 1)).toEqual([]);
    expect(buffer.getRecentHistory(3)).toEqual([]);
    expect(buffer.flush()).toBeNull();
  });
});
