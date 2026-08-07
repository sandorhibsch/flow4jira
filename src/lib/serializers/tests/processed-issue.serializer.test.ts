import { serializeProcessedIssues, deserializeProcessedIssues } from '@/lib/serializers/processed-issue.serializer';

describe('processed-issue.serializer', () => {
  test('serializes and deserializes Date fields', () => {
    const issues = [
      {
        id: 'ISS-1',
        createdAt: new Date('2020-01-01T00:00:00Z'),
        updatedAt: new Date('2020-01-02T00:00:00Z'),
        flowHistory: [{ enteredAt: new Date('2020-01-01T12:00:00Z') }]
      }
    ];

    const raw = serializeProcessedIssues(issues as any);
    expect(typeof raw[0].createdAt).toBe('string');
    expect(typeof raw[0].flowHistory[0].enteredAt).toBe('string');

    const parsed = deserializeProcessedIssues(raw);
    expect(parsed[0].createdAt instanceof Date).toBeTruthy();
    expect(parsed[0].flowHistory[0].enteredAt instanceof Date).toBeTruthy();
    expect(parsed[0].createdAt.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });
});