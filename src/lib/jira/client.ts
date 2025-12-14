// src/lib/jira/client.ts
// DEPRECATED: This file is kept for backward compatibility only.

import { JiraServerClient } from './jira-server-client';
import { JiraCloudClient } from './jira-cloud-client';
import { JiraClientBase, JiraApiError } from './jira-client-base';
import { JiraClientFactory } from './jira-client-factory';

// Re-export JiraServerClient as JiraClient for backward compatibility
// Using a named export that Jest can mock
export const JiraClient = JiraServerClient;

// Re-export everything else
export { JiraApiError, JiraClientBase, JiraCloudClient, JiraClientFactory };

// Re-export all types
export * from './jira-types';
