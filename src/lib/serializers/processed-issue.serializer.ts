export function serializeProcessedIssues(issues: any[]): any[] {
  return issues.map(issue => ({
    ...issue,
    createdAt: issue.createdAt instanceof Date ? issue.createdAt.toISOString() : issue.createdAt,
    updatedAt: issue.updatedAt instanceof Date ? issue.updatedAt.toISOString() : issue.updatedAt,
    flowHistory: (issue.flowHistory || []).map((h: any) => ({
      ...h,
      enteredAt: h.enteredAt instanceof Date ? h.enteredAt.toISOString() : h.enteredAt,
      leftAt: h.leftAt instanceof Date ? h.leftAt.toISOString() : h.leftAt
    }))
  }));
}

export function deserializeProcessedIssues(raw: any[]): any[] {
  return raw.map(issue => ({
    ...issue,
    createdAt: issue.createdAt ? new Date(issue.createdAt) : undefined,
    updatedAt: issue.updatedAt ? new Date(issue.updatedAt) : undefined,
    flowHistory: (issue.flowHistory || []).map((h: any) => ({
      ...h,
      enteredAt: h.enteredAt ? new Date(h.enteredAt) : undefined,
      leftAt: h.leftAt ? new Date(h.leftAt) : undefined
    }))
  }));
}