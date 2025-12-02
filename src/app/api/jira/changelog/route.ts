import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira/client';

const jiraConfig = {
  baseUrl: process.env.JIRA_BASE_URL!,
  bearerToken: process.env.JIRA_PERSONAL_ACCESS_TOKEN!,
};

export async function POST(request: NextRequest) {
  try {
    const { issueKeys } = await request.json();

    if (!Array.isArray(issueKeys)) {
      return NextResponse.json(
        { error: 'issueKeys must be an array' },
        { status: 400 }
      );
    }

    const jiraClient = new JiraClient(jiraConfig);

    // Fetch changelogs for all issues
    const changelogPromises = issueKeys.map(async (key: string) => {
      try {
        const changelog = await jiraClient.getIssueWithChangelog(key);
        return { issueKey: key, changelog };
      } catch (error) {
        console.error(`Failed to get changelog for ${key}:`, error);
        return { issueKey: key, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.allSettled(changelogPromises);

    const changelogs = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          issueKey: issueKeys[index],
          error: result.reason instanceof Error ? result.reason.message : 'Failed to fetch'
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: changelogs,
      metadata: {
        totalRequested: issueKeys.length,
        successful: changelogs.filter(c => !c.error).length,
        failed: changelogs.filter(c => c.error).length,
      }
    });

  } catch (error) {
    console.error('Changelog API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changelogs' },
      { status: 500 }
    );
  }
}