import type { JiraChangelogResponse, JiraIssue } from "../jira/jira-types"

export type StatusChange = {
  to: string,
  enteredAt: Date
  isAddedToSprint?: boolean
}

export function filterStatusChanges(issue: JiraIssue, changelog?: JiraChangelogResponse): StatusChange[] {
  const histories = changelog ? changelog.histories : [];

  // Flatten only status changes
  const statusChanges: StatusChange[] = histories.flatMap(history => {
    const transitionDate = new Date(history.created);
    return history.items
      .filter(item => item.field === 'status' || item.field === 'Sprint')
      .map(item => ({
        to: item.toString ?? item.to ?? 'backlog',
        enteredAt: transitionDate,
        isAddedToSprint: item.field === 'Sprint'
      }));
  });

  return statusChanges;
}

