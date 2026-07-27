import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import KeyboardShortcuts from '../src/components/KeyboardShortcuts.jsx';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{location.pathname}</output>;
}

test('shortcut help behaves as an accessible keyboard modal', async () => {
  render(
    <MemoryRouter>
      <button type="button">Workspace trigger</button>
      <KeyboardShortcuts />
    </MemoryRouter>
  );

  const trigger = screen.getByRole('button', { name: 'Workspace trigger' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: '?' });

  expect(screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
  const close = screen.getByRole('button', { name: 'Close keyboard shortcuts' });
  await waitFor(() => expect(close).toHaveFocus());

  fireEvent.keyDown(close, { key: 'Escape' });

  expect(screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' })).not.toBeInTheDocument();
  await waitFor(() => expect(trigger).toHaveFocus());
});

test('route sequences navigate without updating the router during render', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <MemoryRouter initialEntries={['/risk']}>
      <KeyboardShortcuts />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.keyDown(window, { key: 'g' });
  fireEvent.keyDown(window, { key: 'd' });

  await waitFor(() => expect(screen.getByLabelText('location')).toHaveTextContent('/'));
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});
