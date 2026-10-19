import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as authService from './services/authService';

test('renders login page title and social login buttons', () => {
  render(<App />);
  const headingElement = screen.getByText(/로그인 \/ 회원가입/i);
  expect(headingElement).toBeInTheDocument();

  const kakaoButton = screen.getByText(/카카오로 시작하기/i);
  expect(kakaoButton).toBeInTheDocument();

  const naverButton = screen.getByText(/네이버로 시작하기/i);
  expect(naverButton).toBeInTheDocument();
});

test('navigates from login page to register page and back', () => {
  render(<App />);
  
  // Click "이메일로 회원가입"
  const registerLink = screen.getByText(/이메일로 회원가입/i);
  fireEvent.click(registerLink);

  // Should see Register page header
  const registerTitle = screen.getByRole('heading', { name: /이메일 회원가입/i });
  expect(registerTitle).toBeInTheDocument();

  // Check form fields
  expect(screen.getByPlaceholderText(/홍길동 또는 여행자민준/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/traveler@example.com/i)).toBeInTheDocument();

  // Click "← 로그인으로"
  const backToLoginBtn = screen.getByText(/← 로그인으로/i);
  fireEvent.click(backToLoginBtn);

  // Should return to Login page
  expect(screen.getByText(/로그인 \/ 회원가입/i)).toBeInTheDocument();
});

test('submits registration form with backend api service', async () => {
  const registerSpy = jest.spyOn(authService, 'registerUser').mockResolvedValueOnce({
    success: true,
    message: '홍길동님, 회원가입이 성공적으로 완료되었습니다!',
    data: {
      id: 'usr_123',
      name: '홍길동',
      email: 'traveler@example.com',
      createdAt: new Date().toISOString(),
    },
  });

  render(<App />);
  
  // Go to register
  fireEvent.click(screen.getByText(/이메일로 회원가입/i));

  // Fill in inputs
  fireEvent.change(screen.getByPlaceholderText(/홍길동 또는 여행자민준/i), {
    target: { value: '홍길동' },
  });
  fireEvent.change(screen.getByPlaceholderText(/traveler@example.com/i), {
    target: { value: 'traveler@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText(/영문, 숫자 포함 6자리 이상/i), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByPlaceholderText(/비밀번호 다시 입력/i), {
    target: { value: 'password123' },
  });

  // Submit form
  const submitButton = screen.getByRole('button', { name: /이메일로 회원가입 완료/i });
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(registerSpy).toHaveBeenCalledWith({
      name: '홍길동',
      email: 'traveler@example.com',
      password: 'password123',
    });
  });

  registerSpy.mockRestore();
});
