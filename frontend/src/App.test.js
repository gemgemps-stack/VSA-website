import { render } from '@testing-library/react';
import App from './App';

test('renders the app shell without crashing', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const { container } = render(<App />);
  expect(container).toBeTruthy();
  warnSpy.mockRestore();
});
