import { DefaultColors, IssueTypeColors } from '@/components/ui/color-palettes';

export function buildIssueTypeColorMap(issueTypes: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  for (const issueType of issueTypes) {
    const predefinedColor = IssueTypeColors[issueType];
    if (predefinedColor) {
      colorMap.set(issueType, predefinedColor);
      continue;
    }
    const usedColors = new Set(colorMap.values());
    const availableColor = DefaultColors.find(color => !usedColors.has(color))
      ?? DefaultColors[colorMap.size % DefaultColors.length]!;
    colorMap.set(issueType, availableColor);
  }
  return colorMap;
}
