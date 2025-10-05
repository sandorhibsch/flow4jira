'use client'
import { useState } from 'react';

type UserData = {
  displayName: string,
  emailAddress: string
}

type Result = {
  success: boolean,
  data?: UserData,
  error: string
}

export default function JiraServerTest() {

  const [jiraUrl, setJiraUrl] = useState('');
  const [bearerToken, setBearerToken] = useState('');

  const [result, setResult] = useState<Result>();
  const [loading, setLoading] = useState(false);

  const testBearerTokenAuth = async () => {
    if (!jiraUrl || !bearerToken) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // Test basic auth by calling /myself endpoint
      const auth = bearerToken;
      const testUrl = `${jiraUrl}/rest/api/latest/myself`;

      console.log('Testing URL:', testUrl);

      const response = await fetch('/api/test-jira-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: testUrl,
          auth: auth
        })
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: "Failed to authenticate",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Jira Server Bearer Token Auth Test
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Jira Server URL:
              </label>
              <input
                type="text"
                value={jiraUrl}
                onChange={(e) => setJiraUrl(e.target.value)}
                placeholder="https://jira.yourcompany.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md "
              />
              <p className="text-xs mt-1">
                Your internal Jira server URL (without trailing slash)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium mb-2">
                  Personal Access Token:
                </label>
                <input
                  type="password"
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  placeholder="your personal access token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={testBearerTokenAuth}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Bearer Token Auth'}
              </button>
            </div>
          </div>
        </div>

        {result && result.success && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">✅ Bearer Token Auth Works!</h2>


          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {result.success ? '✅ Result' : '❌ Error'}
            </h3>

            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="text-sm overflow-x-auto text-gray-700">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            {result.success && result.data?.displayName && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium text-green-800">Connection Successful!</h4>
                <p className="text-green-700">
                  Logged in as: <strong>{result.data.displayName}</strong> ({result.data.emailAddress})
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}