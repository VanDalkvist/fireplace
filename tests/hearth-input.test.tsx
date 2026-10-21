import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HearthInput } from '../src/components/HearthInput';

describe('HearthInput Component', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <HearthInput
        isOpen={false}
        activeSpeakerId={1}
        engineStatus={{ online: true, hasModel: true }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders input form with active speaker ID and model badge when open', () => {
    const html = renderToString(
      <HearthInput
        isOpen={true}
        activeSpeakerId={5}
        engineStatus={{ online: true, hasModel: true }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('[05]');
    expect(html).toContain('qwen2.5');
    expect(html).toContain('placeholder="что ты чувствуешь сейчас? (Enter отправить, Esc закрыть)"');
  });

  it('renders lexicon badge when model is offline', () => {
    const html = renderToString(
      <HearthInput
        isOpen={true}
        activeSpeakerId={12}
        engineStatus={{ online: false, hasModel: false }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('[12]');
    expect(html).toContain('словарь');
  });
});
