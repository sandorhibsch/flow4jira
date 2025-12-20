import { JiraClientFactory } from "./jira-client-factory";
import { JiraCloudClient } from "./jira-cloud-client";
import { JiraServerClient } from "./jira-server-client";
import { JiraConfig } from "./jira-types";

const JIRA_SERVER_CONFIG: JiraConfig = {
  instanceType: 'server',
  baseUrl: 'https://jira.example.com',
  bearerToken: 'test_token'
}

const JIRA_CLOUD_CONFIG: JiraConfig = {
  instanceType: 'cloud',
  baseUrl: 'https://jira.example.com',
  basicAuth: {
    email: 'test@example.com',
    apiToken: 'test_token'
  }
}

describe('JiraClientFactory - Create client from config', () => {
  it('should create client instance from server config', () => {
    const serverClient = JiraClientFactory.create(JIRA_SERVER_CONFIG);

    expect(serverClient).toBeInstanceOf(JiraServerClient);
  });

  it('should create cloud instance from cloud config', () => {
    const serverClient = JiraClientFactory.create(JIRA_CLOUD_CONFIG);

    expect(serverClient).toBeInstanceOf(JiraCloudClient);
  });
});

describe('JiraClientFactory - Create server or cloud config from env variables', () => {

  beforeAll(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
  });

  it('should create server client from server env', () => {
    process.env.JIRA_INSTANCE_TYPE = 'server';
    process.env.JIRA_PERSONAL_ACCESS_TOKEN = 'test_token';

    const config = JiraClientFactory.createConfigFromEnv();

    expect(config.instanceType).toBe('server');
    expect(config.baseUrl).toBe('https://jira.example.com');
    expect(config.bearerToken).toBe('test_token');
    expect(config.basicAuth).toBeUndefined();
  });

  it('should create cloud client from cloud env', () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_INSTANCE_TYPE = 'cloud';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'test_token';

    const config = JiraClientFactory.createConfigFromEnv();

    expect(config.instanceType).toBe('cloud');
    expect(config.baseUrl).toBe('https://jira.example.com');
    expect(config.basicAuth).toBeDefined();
    expect(config.basicAuth?.email).toBe('test@example.com');
    expect(config.basicAuth?.apiToken).toBe('test_token');
  });




});

describe('JiraClientFactory - Error handling', () => {

  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
  });

  it('should throw error if baseUrl is missing', () => {
    delete (process.env.JIRA_BASE_URL);

    expect(() => JiraClientFactory.createConfigFromEnv()).toThrow('JIRA_BASE_URL environment variable is required');
  });

  it('should throw error if personal access token is missing for server', () => {
    process.env.JIRA_INSTANCE_TYPE = 'server';
    delete (process.env.JIRA_PERSONAL_ACCESS_TOKEN);

    expect(() => JiraClientFactory.createConfigFromEnv()).toThrow('JIRA_PERSONAL_ACCESS_TOKEN environment variable is required for Jira Server');
  });

  it('should throw error if email or api token is missing for cloud', () => {
    process.env.JIRA_INSTANCE_TYPE = 'cloud';
    delete (process.env.JIRA_EMAIL);
    delete (process.env.JIRA_API_TOKEN);

    expect(() => JiraClientFactory.createConfigFromEnv()).toThrow('JIRA_EMAIL and JIRA_API_TOKEN environment variables are required for Jira Cloud');
  });

  afterAll(() => {
    delete (process.env.JIRA_BASE_URL);
    delete (process.env.JIRA_INSTANCE_TYPE);
    delete (process.env.JIRA_PERSONAL_ACCESS_TOKEN);
    delete (process.env.JIRA_EMAIL);
    delete (process.env.JIRA_API_TOKEN);
  });


});