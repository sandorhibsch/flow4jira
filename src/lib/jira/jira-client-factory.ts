import { JiraConfig, JiraInstanceType } from './jira-types';
import { JiraClientBase } from './jira-client-base';
import { JiraServerClient } from './jira-server-client';
import { JiraCloudClient } from './jira-cloud-client';
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

          if (config.jiraUrl || config.jiraBaseUrl) {
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

  /**
   * Helper to create config from environment variables
   * @returns JiraConfig based on JIRA_INSTANCE_TYPE env var
   * @throws Error if required environment variables are missing
   */
  static createConfigFromEnv(): JiraConfig {
    const fileConfig = this.loadConfigFromFile();

    const instanceType = (process.env.JIRA_INSTANCE_TYPE || fileConfig?.instanceType || 'server') as JiraInstanceType;
    const baseUrl = process.env.JIRA_BASE_URL || fileConfig?.baseUrl;

    if (!baseUrl) {
      throw new Error('JIRA_BASE_URL environment variable is required');
    }

    if (instanceType === 'server') {
      const bearerToken = process.env.JIRA_PERSONAL_ACCESS_TOKEN;

      if (!bearerToken) {
        throw new Error('JIRA_PERSONAL_ACCESS_TOKEN environment variable is required for Jira Server');
      }

      return {
        instanceType: 'server',
        baseUrl,
        bearerToken,
      };
    } else if (instanceType === 'cloud') {
      const email = process.env.JIRA_EMAIL;
      const apiToken = process.env.JIRA_API_TOKEN;

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
}
