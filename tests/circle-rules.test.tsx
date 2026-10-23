import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CircleRules } from "@/components/salon/CircleRules";
import { SalonExperience } from "@/components/SalonExperience";
import { CircleRulesContent } from "@/components/salon/CircleRulesContent";
import { CopyCircleRulesButton } from "@/components/salon/CopyCircleRulesButton";
import { CIRCLE_RULES } from "@/content/circle-rules";
import { writeClipboardText } from "@/infrastructure/browser-clipboard";

const introduction = "Это может быть непривычно. Если собьёмся — просто вернёмся к договорённостям.";
const agreements = [
  "Говорим от себя: о своих чувствах, эмоциях и переживаниях. Без обобщений за других. Не стараемся ответить другим — прислушиваемся к себе.",
  "Слушаем, не перебивая. Говорим, когда другой закончил. Руки не поднимаем — просто вступаем, если есть что сказать.",
  "Не оцениваем друг друга — даже положительно. «Молодец» и «ты крутой» — тоже оценка.",
  "Не даём советов и рекомендаций. Не объясняем другому, что с ним происходит и что ему нужно делать. Если хочется посоветовать — можно заметить этот импульс и спросить себя: «Есть ли в этом что-то для меня?» Озвучивать ответ необязательно.",
  "Не уходим в теории, методологии и поучительные истории. Возвращаемся к собственному переживанию.",
  "Можно молчать и присоединиться, когда захочется. Не нужно рассказывать больше, чем хочется. Паузы не обязательно заполнять.",
  "Личные истории остаются внутри круга. Не записываем встречу, отключаем автоматические транскрипты. Не передаём чужие слова за пределы круга. Любое использование распознавания речи или нейрообработки отдельно согласовываем со всеми.",
  "Эти договорённости относятся и ко мне. Если мы от них отойдём, я буду останавливать и возвращать разговор к рамке.",
];
const stripTags = (html: string) => html.replace(/<[^>]+>/g, "");
const expectedCopy = [introduction, ...agreements.map((rule, i) => `${i + 1}. ${rule}`)].join("\n\n");

describe("circle rules", () => {
  it("provides full plain text with the introduction and numbered original paragraphs", () => {
    expect(CIRCLE_RULES.text).toBe(expectedCopy);
  });

  it("renders an independent icon-only Copy button in the header without opening rules", () => {
    const html = renderToStaticMarkup(<CopyCircleRulesButton />);
    expect(html).toContain('aria-label="Копировать правила круга"');
    expect(html).toContain("lucide-copy");
    expect(html).not.toContain("aria-haspopup");
    expect(html).not.toContain('role="dialog"');
    const page = renderToStaticMarkup(<SalonExperience />);
    expect(page.indexOf('aria-label="Копировать правила круга"')).toBeGreaterThan(page.indexOf('aria-label="Правила круга"'));
  });

  it("awaits the clipboard and writes the exact full text", async () => {
    let text = "";
    await writeClipboardText(CIRCLE_RULES.text, { writeText: async value => { text = value; } });
    expect(text).toBe(expectedCopy);
  });

  it("preserves permission rejection instead of reporting copied", async () => {
    const denied = new DOMException("Denied", "NotAllowedError");
    await expect(writeClipboardText("rules", { writeText: async () => { throw denied; } })).rejects.toBe(denied);
  });

  it("rejects unavailable clipboard without a hidden fallback", async () => {
    await expect(writeClipboardText("rules", undefined)).rejects.toMatchObject({ name: "NotSupportedError" });
  });
  it("preserves the exact supplied introduction and eight ordered agreements", () => {
    const html = renderToStaticMarkup(<CircleRulesContent />);
    expect(html).toContain(`<p>${introduction}</p>`);
    expect(html).toContain("<ol");
    const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(match => stripTags(match[1]));
    expect(items).toEqual(agreements);
    expect([...html.matchAll(/<strong[ >]/g)]).toHaveLength(8);
  });

  it("keeps the book to the right of the gear, outside its left-expanding control bar", () => {
    const html = renderToStaticMarkup(<SalonExperience />);
    const gear = html.indexOf('title="Технические настройки (шестерёнка)"');
    const book = html.indexOf('aria-label="Правила круга"');
    expect(gear).toBeGreaterThan(-1);
    expect(book).toBeGreaterThan(gear);
  });

  it("renders only an accessible book icon button and starts closed", () => {
    const html = renderToStaticMarkup(<CircleRules />);
    const button = html.match(/<button[^>]*>([\s\S]*?)<\/button>/)?.[1];
    expect(button).toBeDefined();
    expect(stripTags(button ?? "")).toBe("");
    expect(html).toContain('aria-label="Правила круга"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("lucide-book-open");
    expect(html).not.toContain(introduction);
  });
});
