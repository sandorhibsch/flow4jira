import { downloadJson, readJsonFile, type DownloadAnchor, type JsonDownloadEnvironment } from './json-file';

describe('JSON file browser boundary', () => {
  it('parses JSON from a text-bearing file', async () => {
    await expect(readJsonFile({ text: async () => '{"boardId":"42"}' })).resolves.toEqual({ boardId: '42' });
  });

  it('preserves JSON parse errors for the caller to present', async () => {
    await expect(readJsonFile({ text: async () => '{' })).rejects.toBeInstanceOf(SyntaxError);
  });

  it('downloads formatted JSON and always releases its object URL', async () => {
    let downloadedBlob: Blob | undefined;
    const anchor: DownloadAnchor = { href: '', download: '', click: jest.fn() };
    const environment: JsonDownloadEnvironment = {
      createObjectUrl: blob => {
        downloadedBlob = blob;
        return 'blob:board-config';
      },
      revokeObjectUrl: jest.fn(),
      createAnchor: () => anchor,
    };

    downloadJson({ boardId: '42' }, 'Delivery-config.json', environment);

    expect(anchor).toMatchObject({ href: 'blob:board-config', download: 'Delivery-config.json' });
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(environment.revokeObjectUrl).toHaveBeenCalledWith('blob:board-config');
    await expect(downloadedBlob!.text()).resolves.toBe('{\n  "boardId": "42"\n}');
    expect(downloadedBlob?.type).toBe('application/json');
  });

  it('releases the URL even if the browser rejects the click', () => {
    const environment: JsonDownloadEnvironment = {
      createObjectUrl: () => 'blob:board-config',
      revokeObjectUrl: jest.fn(),
      createAnchor: () => ({ href: '', download: '', click: () => { throw new Error('blocked'); } }),
    };

    expect(() => downloadJson({}, 'config.json', environment)).toThrow('blocked');
    expect(environment.revokeObjectUrl).toHaveBeenCalledWith('blob:board-config');
  });
});
