import { render, screen } from '@testing-library/react';
import AIFloorPage from '../src/pages/AIFloorPage';
import { AgentEventsProvider } from '../src/hooks/useAgentEvents';
import { vi } from 'vitest';

vi.mock('pixi.js', () => ({
  Application: class {
    init() {
      return Promise.resolve();
    }
    canvas = document.createElement('canvas');
    stage = { addChild: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn() };
    destroy() {}
  },
  Assets: {
    load: vi.fn().mockResolvedValue({ width: 32, height: 32, source: {} }),
  },
  Sprite: class {
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
  },
  Rectangle: class {},
  Texture: class {},
  Graphics: class {
    circle() {}
    fill() {}
  },
}));

test('renders activity log panel', () => {
  render(
    <AgentEventsProvider>
      <AIFloorPage />
    </AgentEventsProvider>
  );
  expect(screen.getByText('Activity Log')).toBeInTheDocument();
});
