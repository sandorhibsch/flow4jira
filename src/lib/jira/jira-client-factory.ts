import type { JiraConfig, JiraInstanceType } from './jira-types';
import type { JiraClientBase } from './jira-client-base';
import { JiraServerClient } from './jira-server-client';
import { JiraCloudClient } from './jira-cloud-client';
import { getJiraConfigFromLocalStorage } from '../repositories/jira-config.local.repository';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Factory for creating the appropriate Jira client based on instance type
 */
export class JiraClientFactory {
  /**
   * Create a Jira client based on configuration
   * @param config - Jira configuration with instanceType
   * @returns JiraClientBase instance (either Server or Cloud)
   * @throws Error if instanceType is unknown
   */
  static create(config: JiraConfig): JiraClientBase {
    switch (config.instanceType) {
      case 'server':
        return new JiraServerClient(config);

      case 'cloud':
        return new JiraCloudClient(config);

      default:
        throw new Error(
          `Unknown Jira instance type: ${config.instanceType}. Must be 'server' or 'cloud'.`
        );
    }
  }

  /**
   * Load config from config.json file
   **/
  private static loadConfigFromFile(): Partial<JiraConfig> | null {
    const possiblePaths = [
      path.join(process.cwd(), 'config.json'),
      process.env.APPDATA
        ? path.join(process.env.APPDATA, 'Flow4Jira', 'config.json')
        : path.join(process.env.HOME || '', 'Library', 'Application Support', 'Flow4Jira', 'config.json'),
      path.join(path.dirname(process.execPath), 'config.json')
    ];

    for (const configPath of possiblePaths) {
      try {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content);


          if (config.jiraUrl) {
            return {
              baseUrl: config.jiraUrl || config.jiraBaseUrl,
              instanceType: config.instanceType || (config.jiraEmail ? 'cloud' : 'server'),
              bearerToken: config.jiraBearerToken || config.jiraPersonalAccessToken,
              basicAuth: config.jiraEmail && config.jiraApiToken ? {
                email: config.jiraEmail,
                apiToken: config.jiraApiToken
              } : undefined
            };
          }
        }
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error);
      }
    }
    return null;
  }

  static createConfigFromEnv(): JiraConfig {
    const fileConfig = this.loadConfigFromFile();

    const instanceType = (process.env.JIRA_INSTANCE_TYPE || fileConfig?.instanceType || 'server') as JiraInstanceType;
    const baseUrl = process.env.JIRA_BASE_URL || fileConfig?.baseUrl;

    if (!baseUrl) {
      throw new Error('JIRA_BASE_URL environment variable is required');
    }

    if (instanceType === 'server') {
      const bearerToken = (process.env.JIRA_PERSONAL_ACCESS_TOKEN || fileConfig?.bearerToken);

      if (!bearerToken) {
        throw new Error('JIRA_PERSONAL_ACCESS_TOKEN environment variable is required for Jira Server');
      }

      return {
        instanceType: 'server',
        baseUrl,
        bearerToken,
      };
    } else if (instanceType === 'cloud') {
      const email = (process.env.JIRA_EMAIL || fileConfig?.basicAuth?.email);
      const apiToken = (process.env.JIRA_API_TOKEN || fileConfig?.basicAuth?.apiToken);

      if (!email || !apiToken) {
        throw new Error('JIRA_EMAIL and JIRA_API_TOKEN environment variables are required for Jira Cloud');
      }

      return {
        instanceType: 'cloud',
        baseUrl,
        basicAuth: {
          email,
          apiToken,
        },
      };
    } else {
      throw new Error(
        `Invalid JIRA_INSTANCE_TYPE: ${instanceType}. Must be 'server' or 'cloud'.`
      );
    }
  }

  static createConfigFromLocalStorage(): JiraConfig {
    // Dynamically import to avoid SSR issues
    let config: JiraConfig | null = null;
    try {
      // Only run in browser
      config = getJiraConfigFromLocalStorage();
    } catch { }
    if (!config) {
      throw new Error('Jira config not found in browser localStorage');
    }
    if (!config.baseUrl) {
      throw new Error('Jira URL is required');
    }
    if (config.instanceType === 'server' && !config.bearerToken) {
      throw new Error('Personal Access Token is required for Jira Server');
    }
    if (config.instanceType === 'cloud' && (!config.basicAuth?.email || !config.basicAuth?.apiToken)) {
      throw new Error('Email and API Token are required for Jira Cloud');
    }
    return config;
  }
}
