import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentimentCommentForm } from './SentimentCommentForm';

describe('SentimentCommentForm', () => {
  it('submits valid comment', () => {
    const onSubmit = vi.fn();
    render(<SentimentCommentForm isSubmitting={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/short comment/i), {
      target: { value: 'Great world!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));
    expect(onSubmit).toHaveBeenCalledWith('Great world!');
  });

  it('shows validation error for url and does not submit', () => {
    const onSubmit = vi.fn();
    render(<SentimentCommentForm isSubmitting={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/short comment/i), {
      target: { value: 'https://example.com' },
    });
    expect(screen.getByText(/links are not allowed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gives the textarea a programmatic label', () => {
    render(<SentimentCommentForm isSubmitting={false} onSubmit={vi.fn()} />);
    expect(
      screen.getByRole('textbox', { name: /comment/i }),
    ).toBeInTheDocument();
  });

  it('announces validation errors and links them to the textarea', () => {
    render(<SentimentCommentForm isSubmitting={false} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: /comment/i }), {
      target: { value: 'https://example.com' },
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/links are not allowed/i);
    expect(
      screen.getByRole('textbox', { name: /comment/i }),
    ).toHaveAttribute('aria-describedby', alert.id);
  });
});
