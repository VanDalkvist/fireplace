import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CircleRules } from "@/components/salon/CircleRules";
import { SalonExperience } from "@/components/SalonExperience";
import { CircleRulesContent } from "@/components/salon/CircleRulesContent";

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

describe("circle rules", () => {
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
