import { TEST_WORKFLOW } from '../testutils/create-mocks';
import { parseBoardConfigImportDocument } from './board-config-import-document';

describe('parseBoardConfigImportDocument', () => {
  it('translates an exported board document into persistence input', () => {
    const result = parseBoardConfigImportDocument({
      metadata: {
        boardId: '42',
        boardName: 'Delivery',
        boardType: 'kanban',
        periodDays: 60,
        updatedAt: '2026-08-29T00:00:00.000Z',
      },
      workflow: TEST_WORKFLOW,
      processedIssues: [{ ignored: true }],
    });

    expect(result).toEqual({
      success: true,
      data: {
        boardId: '42',
        boardName: 'Delivery',
        boardType: 'kanban',
        periodDays: 60,
        workflow: TEST_WORKFLOW,
      },
    });
  });

  it('applies defaults for optional metadata', () => {
    expect(parseBoardConfigImportDocument({
      metadata: { boardId: '42' },
      workflow: TEST_WORKFLOW,
    })).toEqual({
      success: true,
      data: {
        boardId: '42',
        boardName: '',
        boardType: 'scrum',
        periodDays: 30,
        workflow: TEST_WORKFLOW,
      },
    });
  });

  it.each([
    [null, 'Import data must be a valid object'],
    [{ workflow: TEST_WORKFLOW }, 'Import data must contain metadata'],
    [{ metadata: { boardId: '42' } }, 'Import data must contain workflow'],
    [{ metadata: {}, workflow: TEST_WORKFLOW }, 'Metadata must contain boardId'],
  ])('rejects an invalid document %#', (document, error) => {
    expect(parseBoardConfigImportDocument(document)).toEqual({ success: false, error });
  });
});
