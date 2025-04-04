/**
 * Integration Tests for Jira and Zendesk Integrations
 * 
 * This file contains tests for both Jira and Zendesk integrations to ensure
 * they are functioning correctly. Run these tests before deploying updates.
 */

import { JiraConfig } from '../integrations/integration-service';
import { JiraService } from '../integrations/jira';
import { ZendeskConfig } from '../integrations/zendesk';
import { ZendeskService } from '../integrations/zendesk';
import axios from 'axios';

// Mock API responses
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Jira Integration Tests', () => {
  let jiraService: JiraService;
  const testConfig: JiraConfig = {
    host: 'https://test-jira.atlassian.net',
    username: 'test@example.com',
    apiToken: 'mock-jira-token',
    projectKey: 'TEST',
    issueType: 'Task',
    enabled: true
  };

  beforeEach(() => {
    jiraService = new JiraService(testConfig);
    jest.clearAllMocks();
  });

  test('Creates Jira issue successfully', async () => {
    // Setup mock response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        id: '12345',
        key: 'TEST-123',
        self: 'https://test-jira.atlassian.net/rest/api/2/issue/12345'
      }
    });

    const result = await jiraService.createIssue(
      testConfig,
      'Test issue',
      'Test description',
      'bug'
    );

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: '12345',
      key: 'TEST-123',
      self: 'https://test-jira.atlassian.net/rest/api/2/issue/12345'
    });
  });

  test('Verifies connection successfully', async () => {
    // Setup mock response
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        self: 'https://test-jira.atlassian.net/rest/api/2/myself',
        accountId: 'test-account-id',
        emailAddress: 'test@example.com',
        displayName: 'Test User'
      }
    });

    const result = await jiraService.verifyConnection();
    
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://test-jira.atlassian.net/rest/api/2/myself',
      { 
        auth: { 
          username: 'test@example.com', 
          password: 'mock-jira-token' 
        },
        timeout: expect.any(Number)
      }
    );
    expect(result).toBe(true);
  });

  test('Handles connection failure', async () => {
    // Setup mock response
    mockedAxios.get.mockRejectedValueOnce(new Error('Connection failed'));

    const result = await jiraService.verifyConnection();
    
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  test('Handles issue creation failure', async () => {
    // Setup mock response
    mockedAxios.post.mockRejectedValueOnce(new Error('Creation failed'));

    try {
      await jiraService.createIssue(
        testConfig,
        'Test issue',
        'Test description',
        'bug'
      );
      
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(error).toBeDefined();
    }
  });
});

describe('Zendesk Integration Tests', () => {
  let zendeskService: ZendeskService;
  const testConfig: ZendeskConfig = {
    subdomain: 'test-company',
    email: 'test@example.com',
    username: 'test@example.com',
    apiToken: 'mock-zendesk-token',
    enabled: true
  };

  beforeEach(() => {
    zendeskService = new ZendeskService(testConfig);
    jest.clearAllMocks();
  });

  test('Creates Zendesk ticket successfully', async () => {
    // Setup mock response
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      statusText: 'OK',
      data: {
        ticket: {
          id: 12345,
          subject: 'Test ticket',
          description: 'Test description'
        }
      }
    });

    const result = await zendeskService.createTicket({
      title: 'Test ticket',
      description: 'Test description',
      category: 'bug',
      complexity: 'medium',
      tenantId: 1
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 12345,
      url: expect.stringContaining('https://test-company.zendesk.com/agent/tickets/12345')
    });
  });

  test('Verifies connection successfully', async () => {
    // Setup mock response
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        user: {
          id: 12345,
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }
      }
    });

    const result = await zendeskService.verifyConnection();
    
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://test-company.zendesk.com/api/v2/users/me',
      expect.objectContaining({ 
        auth: expect.objectContaining({ 
          username: expect.stringContaining('test@example.com')
        }),
        timeout: expect.any(Number)
      })
    );
    expect(result).toBe(true);
  });

  test('Handles connection failure', async () => {
    // Setup mock response
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: {
          error: 'Invalid credentials'
        }
      }
    });

    const result = await zendeskService.verifyConnection();
    
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  test('Handles ticket creation failure', async () => {
    // Setup mock response
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: {
          error: 'Invalid request'
        }
      }
    });

    const result = await zendeskService.createTicket({
      title: 'Test ticket',
      description: 'Test description',
      category: 'bug',
      complexity: 'medium',
      tenantId: 1
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 0,
      url: '',
      error: expect.stringContaining('Zendesk API error')
    });
  });
});