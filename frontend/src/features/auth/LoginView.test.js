import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginView from './LoginView';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('LoginView', () => {
  it('submits the current form values even when the React state was not updated', async () => {
    const login = jest.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ login });
    useNavigate.mockReturnValue(jest.fn());

    render(<LoginView />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = screen.getByRole('button', { name: /sign in/i }).closest('form');

    emailInput.value = 'tester@example.com';
    passwordInput.value = 'Example123!';

    fireEvent.submit(form);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('tester@example.com', 'Example123!');
    });
  });
});
