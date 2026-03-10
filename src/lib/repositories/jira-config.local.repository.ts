// Centralized helpers for Jira config localStorage access and editing
import type { JiraConfig } from '../jira/jira-types';

const LOCAL_STORAGE_KEY = 'jiraConfig';

export function getJiraConfigFromLocalStorage(): JiraConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as JiraConfig;
  } catch {
    return null;
  }
}

export function setJiraConfigToLocalStorage(config: JiraConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
}

export function clearJiraConfigFromLocalStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}