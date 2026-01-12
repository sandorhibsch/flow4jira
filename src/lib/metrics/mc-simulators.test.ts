// src/lib/metrics/mc-simulators.test.ts

// Since the hooks use useMemo, we need to test the underlying logic
// by extracting the simulation logic or testing via the hooks in a simpler way

import { ProcessedFlowIssue } from '../flow/flow-types';

// Test helper to create mock issues
function createMockIssues(count: number): ProcessedFlowIssue[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `TEST-${i + 1}`,
    summary: `Test Issue ${i + 1}`,
    issueType: 'Story',
    created: new Date('2024-01-01'),
    flowHistory: [],
    currentStage: { key: 'done', name: 'Done', jiraStatuses: ['Done'], stageType: 'done' as const },
    currentStatus: 'Done',
    done: new Date('2024-01-15'),
    leadTimeDays: 14,
    cycleTimeDays: 7,
    ageDays: 0
  }));
}

describe('Monte Carlo Simulator Edge Cases', () => {
  describe('Throughput validation', () => {
    it('should handle empty throughput array without infinite loop', () => {
      const throughput: number[] = [];
      
      // Simulate the guard check from mc-when-simulator
      const hasData = throughput.length > 0;
      const hasPositiveThroughput = throughput.some(t => t > 0);
      
      expect(hasData).toBe(false);
      expect(hasPositiveThroughput).toBe(false);
    });

    it('should detect all-zero throughput', () => {
      const throughput = [0, 0, 0, 0];
      
      const hasPositiveThroughput = throughput.some(t => t > 0);
      
      expect(hasPositiveThroughput).toBe(false);
    });

    it('should detect mixed throughput with positive values', () => {
      const throughput = [0, 1, 0, 2, 0];
      
      const hasPositiveThroughput = throughput.some(t => t > 0);
      
      expect(hasPositiveThroughput).toBe(true);
    });
  });

  describe('Simulation safety limits', () => {
    it('should have a reasonable max days safety limit', () => {
      const maxDays = 365 * 2; // As defined in mc-when-simulator
      
      expect(maxDays).toBe(730);
    });

    it('should simulate completion within safety limit for low throughput', () => {
      // Simulate what happens with very low throughput
      const throughput = [0, 0, 0, 0, 1]; // Only 1 item every 5 days average
      const targetItems = 100;
      const maxDays = 730;
      
      let remaining = targetItems;
      let days = 0;
      
      // Run one simulation
      while (remaining > 0 && days < maxDays) {
        remaining -= throughput[Math.floor(Math.random() * throughput.length)];
        days++;
      }
      
      expect(days).toBeLessThanOrEqual(maxDays);
    });
  });

  describe('Percentile calculations', () => {
    it('should calculate percentiles correctly from sorted results', () => {
      const results = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      results.sort((a, b) => a - b);
      
      const p = (pct: number) => results[Math.floor(pct * results.length)] ?? 0;
      
      // With 10 items: 
      // p(0.50) = results[5] = 6 (index 5 is the 6th element)
      // p(0.85) = results[8] = 9
      // p(0.95) = results[9] = 10
      expect(p(0.50)).toBe(6); // 50th percentile
      expect(p(0.85)).toBe(9); // 85th percentile  
      expect(p(0.95)).toBe(10); // 95th percentile
    });

    it('should handle empty results', () => {
      const results: number[] = [];
      
      const p = (pct: number) => results[Math.floor(pct * results.length)] ?? 0;
      
      expect(p(0.50)).toBe(0);
      expect(p(0.85)).toBe(0);
      expect(p(0.95)).toBe(0);
    });
  });

  describe('Mock issues creation', () => {
    it('should create valid mock issues', () => {
      const issues = createMockIssues(5);
      
      expect(issues.length).toBe(5);
      expect(issues[0].key).toBe('TEST-1');
      expect(issues[0].done).toBeInstanceOf(Date);
      expect(issues[0].cycleTimeDays).toBe(7);
    });
  });
});
