import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, NavLink, Route, Routes } from 'react-router-dom';
import { RouteScrollReset } from '../src/components/RouteScrollReset.jsx';

test('resets document scroll when route location changes', () => {
  document.documentElement.scrollTop = 480;

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <RouteScrollReset />
      <NavLink to="/command-center?ticker=TSM">Analyze</NavLink>
      <Routes>
        <Route path="*" element={<div>Route content</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(document.documentElement.scrollTop).toBe(0);

  document.documentElement.scrollTop = 720;
  fireEvent.click(screen.getByRole('link', { name: 'Analyze' }));

  expect(document.documentElement.scrollTop).toBe(0);
});
