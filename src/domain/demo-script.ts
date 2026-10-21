export interface DemoItem {
  speakerId: number;
  text: string;
  family?: string;
  valence?: number;
  desire?: string;
  isPass?: boolean;
}

export const DEMO_PHRASES: DemoItem[] = [
  { speakerId: 1, text: "замедление в теле", family: "спокойствие", valence: 0.8 },
  { speakerId: 6, text: "волнение в груди", family: "страх", valence: -0.6 },
  { speakerId: 10, text: "ком в горле", family: "тело", valence: -0.4 },
  { speakerId: 3, text: "пас", isPass: true },
  { speakerId: 8, text: "тепло от ваших слов", family: "нежность", valence: 1.0 },
  { speakerId: 6, text: "отпускает напряжение", family: "спокойствие", valence: 0.7 },
  { speakerId: 12, text: "пас", isPass: true },
  { speakerId: 4, text: "сильная усталость", family: "усталость", valence: -0.5 },
  { speakerId: 9, text: "растерянность", family: "растерянность", valence: -0.2 },
  { speakerId: 1, text: "благодарность за честность", family: "нежность", valence: 0.9 },
  { speakerId: 10, text: "хочется тишины и выдоха", desire: "тишина" },
  { speakerId: 4, text: "хочу побыть с собой", desire: "побыть с собой" },
  { speakerId: 8, text: "просто помолчать рядом", desire: "помолчать" },
];
