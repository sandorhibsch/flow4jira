/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useBoardConfig } from '@/hooks/use-board-config';
import { getBoardConfigClient } from '@/lib/repositories/client/board-config-client-factory';

jest.mock('@/lib/repositories/client/board-config-client-factory', () => ({
  getBoardConfigClient: jest.fn(),
}));

const mockRepo = {
  findByBoardId: jest.fn(),
  save: jest.fn(),
  listAll: jest.fn(),
  delete: jest.fn(),
};

(getBoardConfigClient as jest.Mock).mockImplementation(() => mockRepo);

function TestComponent({ boardId }: { boardId: string }) {
  const { isLoading, metadata } = useBoardConfig(boardId);
  return React.createElement('div', null, isLoading ? 'loading' : metadata ? metadata.boardId : 'no');
}

describe('useBoardConfig (UI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads config from client repository', async () => {
    mockRepo.findByBoardId.mockResolvedValue({
      success: true,
      data: {
        metadata: { boardId: '6085', boardName: 'B', boardType: 'kanban', periodDays: 30, updatedAt: new Date() },
        workflow: { key: 'k', name: 'n', stages: [] },
        processedIssues: [],
      },
    });

    render(React.createElement(TestComponent, { boardId: '6085' }));

    await waitFor(() => expect(screen.getByText('6085')).toBeInTheDocument());
  });

  test('handles not found (null) response', async () => {
    mockRepo.findByBoardId.mockResolvedValue({ success: true, data: null });

    render(React.createElement(TestComponent, { boardId: '9999' }));

    await waitFor(() => expect(screen.getByText('no')).toBeInTheDocument());
  });
});
