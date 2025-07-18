/**
 * Test utilities for React Testing Library with React 19 compatibility
 */
import React, { ReactElement } from 'react';
import { render as rtlRender, renderHook as rtlRenderHook, RenderOptions, RenderResult } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Custom render function that ensures DOM container exists for React 19
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'container'>
): RenderResult {
  // Create a container element
  const container = document.createElement('div');
  container.setAttribute('id', 'test-root');
  document.body.appendChild(container);

  // Render with explicit container
  const result = rtlRender(ui, {
    container,
    ...options,
  });

  // Return the result with a custom unmount that also removes the container
  return {
    ...result,
    unmount: () => {
      result.unmount();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

/**
 * Custom renderHook function for React 19 compatibility
 */
function customRenderHook<TProps, TResult>(
  callback: (props: TProps) => TResult,
  options?: any
) {
  // Create a container element for the hook
  const container = document.createElement('div');
  container.setAttribute('id', 'hook-test-root');
  document.body.appendChild(container);

  // Use a wrapper that provides the container context
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <div>{children}</div>;
  };

  const result = rtlRenderHook(callback, {
    wrapper,
    ...options,
  });

  // Return with custom unmount
  return {
    ...result,
    unmount: () => {
      result.unmount();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the default render and renderHook with our custom ones
export { customRender as render, customRenderHook as renderHook };