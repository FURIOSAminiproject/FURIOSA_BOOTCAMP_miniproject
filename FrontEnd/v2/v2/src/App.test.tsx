import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page title and social login buttons', () => {
  render(<App />);
  const headingElement = screen.getByText(/로그인 \/ 회원가입/i);
  expect(headingElement).toBeInTheDocument();

  const kakaoButton = screen.getByText(/카카오로 시작하기/i);
  expect(kakaoButton).toBeInTheDocument();

  const naverButton = screen.getByText(/네이버로 시작하기/i);
  expect(naverButton).toBeInTheDocument();
});
