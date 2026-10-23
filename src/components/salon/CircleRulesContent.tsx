import { CIRCLE_RULES } from "@/content/circle-rules";

export const CircleRulesContent = () => (
  <div className="space-y-5">
    <p>{CIRCLE_RULES.introduction}</p>
    <ol className="list-decimal space-y-4 pl-5 marker:text-[color:var(--primary)]/65">
      {CIRCLE_RULES.rules.map(rule => (
        <li key={rule.lead}><strong>{rule.lead}</strong> {rule.body}</li>
      ))}
    </ol>
  </div>
);
