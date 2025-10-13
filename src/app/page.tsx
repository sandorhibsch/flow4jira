'use client';
import { useState } from 'react';
import { JiraIssue } from '@/lib/jira/types';
import IssueList from '@/ui/issue-list';

type Result = {
  success: boolean,
  data?: {
    total: string,
    issues: JiraIssue[],
    maxResults: string,
    startAt: string
  }
  error: string
}

export default function Home() {

  const [jql, setJql] = useState('');
  const [actualQuery, setActualQuery] = useState('');
  const [result, setResult] = useState<Result>();
  const [loading, setLoading] = useState(false);

  const assembleQuery = (query: string) => {
    setJql(query);
    setActualQuery(`https://jira.scigames.at/rest/api/latest/search?jql=${jql}&fields="issuetype,summary,status,resolution,created,resolutiondate"&expand=""`);
  }
  const queryIssuesByJql = async () => {
    if (!jql) {
      alert('Please enter a project key');
      return;
    }

    setLoading(true);
    const fields = "issuetype,summary,status,resolution,created,resolutiondate";
    const expand = "";

    try {
      const response = await fetch(`/api/jira/issues?jql=${jql}&fields=${fields}&expand=${expand}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: "Failed to get search results"
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Query issues (JQL):
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          value={jql}
          onChange={(e) => assembleQuery(e.target.value)}
          placeholder="Enter JQL query"
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={queryIssuesByJql}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Search
        </button>
      </div>

      <div>{actualQuery}</div>

      {result && result.success && result.data && (
        <div>
          <IssueList issues={result.data.issues} />
        </div>

      )};
    </div>
  );
}
