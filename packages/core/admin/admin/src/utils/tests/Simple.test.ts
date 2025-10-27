// Simple non-React test for Vitest
import { describe, it, expect } from 'vitest';

function sum(a: number, b: number): number {
  return a + b;
}

describe('Simple Math Tests', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
  
  it('adds 5 + 5 to equal 10', () => {
    expect(sum(5, 5)).toBe(10);
  });
});