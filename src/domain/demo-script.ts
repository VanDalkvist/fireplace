import type { SessionPhase } from "./types";

export interface DemoItem {
  speakerId: number;
  text: string;
  family?: string;
  valence?: number;
  desire?: string;
  isPass?: boolean;
}

export const DEMO_PHRASES_BY_PHASE: Record<SessionPhase, DemoItem[]> = {
  silence: [
    { speakerId: 1, text: "замедляюсь в теле", family: "спокойствие", valence: 0.7 },
    { speakerId: 5, text: "тишина внутри", family: "спокойствие", valence: 0.8 },
    { speakerId: 9, text: "слушаю своё дыхание", family: "тело", valence: 0.6 },
    { speakerId: 3, text: "пас", isPass: true },
    { speakerId: 7, text: "настраиваюсь на круг", family: "спокойствие", valence: 0.7 },
    { speakerId: 11, text: "отпускаю мысли дня", family: "спокойствие", valence: 0.85 },
    { speakerId: 2, text: "заземление в ногах", family: "тело", valence: 0.6 },
    { speakerId: 6, text: "пас", isPass: true },
    { speakerId: 8, text: "просто слушаю огонь", family: "спокойствие", valence: 0.9 },
    { speakerId: 12, text: "наблюдаю паузу", family: "тело", valence: 0.5 },
  ],
  feelings: [
    { speakerId: 1, text: "замедление в теле", family: "спокойствие", valence: 0.8 },
    { speakerId: 6, text: "волнение в груди", family: "страх", valence: -0.5 },
    { speakerId: 10, text: "ком в горле", family: "тело", valence: -0.4 },
    { speakerId: 3, text: "пас", isPass: true },
    { speakerId: 8, text: "тепло от ваших слов", family: "нежность", valence: 1.0 },
    { speakerId: 5, text: "отпускает напряжение", family: "спокойствие", valence: 0.7 },
    { speakerId: 11, text: "пас", isPass: true },
    { speakerId: 4, text: "сильная усталость за неделю", family: "усталость", valence: -0.5 },
    { speakerId: 9, text: "растерянность в мыслях", family: "растерянность", valence: -0.2 },
    { speakerId: 2, text: "благодарность за честность", family: "нежность", valence: 0.9 },
    { speakerId: 7, text: "трепет внутри", family: "трепет", valence: 0.4 },
    { speakerId: 12, text: "легкая грусть", family: "грусть", valence: -0.3 },
    { speakerId: 3, text: "ясность и покой", family: "спокойствие", valence: 0.9 },
    { speakerId: 8, text: "чувствую уязвимость", family: "страх", valence: -0.3 },
    { speakerId: 5, text: "живость в сердце", family: "живость", valence: 0.85 },
    { speakerId: 10, text: "пас", isPass: true },
    { speakerId: 2, text: "согрелся рядом с вами", family: "нежность", valence: 0.95 },
    { speakerId: 7, text: "тяжесть в плечах уходит", family: "тело", valence: 0.65 },
  ],
  desires: [
    { speakerId: 10, text: "хочется тишины и выдоха", desire: "тишина" },
    { speakerId: 4, text: "хочу побыть с собой", desire: "побыть с собой" },
    { speakerId: 8, text: "просто помолчать рядом", desire: "помолчать" },
    { speakerId: 3, text: "пас", isPass: true },
    { speakerId: 1, text: "хочу замедлить темп", desire: "замедлиться" },
    { speakerId: 7, text: "хочется тепла и поддержки", desire: "тепло" },
    { speakerId: 2, text: "хочу выговориться без советов", desire: "быть услышанным" },
    { speakerId: 9, text: "пас", isPass: true },
    { speakerId: 5, text: "хочу отпустить контроль", desire: "отпустить контроль" },
    { speakerId: 11, text: "хочется просто присутствовать", desire: "присутствие" },
    { speakerId: 6, text: "хочу искренности с собой", desire: "искренность" },
    { speakerId: 12, text: "хочу выдохнуть напряжение", desire: "выдохнуть" },
    { speakerId: 8, text: "хочется бережности", desire: "бережность" },
  ],
  completion: [
    { speakerId: 1, text: "уношу тепло круга с собой", family: "завершение", valence: 0.9 },
    { speakerId: 7, text: "чувство наполненности", family: "спокойствие", valence: 0.85 },
    { speakerId: 3, text: "пас", isPass: true },
    { speakerId: 9, text: "тихий глубокий выдох", family: "тело", valence: 0.7 },
    { speakerId: 5, text: "благодарность каждому здесь", family: "нежность", valence: 1.0 },
    { speakerId: 2, text: "спокойствие и устойчивость в теле", family: "спокойствие", valence: 0.8 },
    { speakerId: 11, text: "пас", isPass: true },
    { speakerId: 8, text: "легче дышать стало", family: "живость", valence: 0.75 },
    { speakerId: 4, text: "чувство завершённости", family: "завершение", valence: 0.8 },
    { speakerId: 12, text: "бережное послевкусие от встречи", family: "нежность", valence: 0.9 },
    { speakerId: 6, text: "спасибо за это пространство", family: "нежность", valence: 0.95 },
  ],
};

// Flattened fallback for backwards compatibility
export const DEMO_PHRASES: DemoItem[] = [
  ...DEMO_PHRASES_BY_PHASE.silence,
  ...DEMO_PHRASES_BY_PHASE.feelings,
  ...DEMO_PHRASES_BY_PHASE.desires,
  ...DEMO_PHRASES_BY_PHASE.completion,
];

export function getDemoPhrasesForPhase(phase: SessionPhase): DemoItem[] {
  return DEMO_PHRASES_BY_PHASE[phase] || DEMO_PHRASES_BY_PHASE.feelings;
}
