// src/presentation/shared/components/Button/Button.tsx
import React from 'react';
import './Button.scss';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  className = '',
  title,
}) => {
  const classNames = [
    'ramiro-button',
    `ramiro-button--${variant}`,
    size !== 'md' ? `ramiro-button--${size}` : '',
    loading ? 'ramiro-button--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
    >
      {loading && <span className="ramiro-button__spinner" />}
      {children}
    </button>
  );
};
