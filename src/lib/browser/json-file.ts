export interface TextFile {
  text(): Promise<string>;
}

export interface DownloadAnchor {
  href: string;
  download: string;
  click(): void;
}

export interface JsonDownloadEnvironment {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createAnchor(): DownloadAnchor;
}

const browserJsonDownloadEnvironment: JsonDownloadEnvironment = {
  createObjectUrl: blob => globalThis.URL.createObjectURL(blob),
  revokeObjectUrl: url => globalThis.URL.revokeObjectURL(url),
  createAnchor: () => globalThis.document.createElement('a'),
};

export async function readJsonFile(file: TextFile): Promise<unknown> {
  return JSON.parse(await file.text());
}

export function downloadJson(
  data: unknown,
  filename: string,
  environment: JsonDownloadEnvironment = browserJsonDownloadEnvironment
): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = environment.createObjectUrl(blob);
  try {
    const anchor = environment.createAnchor();
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    environment.revokeObjectUrl(url);
  }
}
