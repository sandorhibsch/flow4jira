'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JiraConfig, JiraInstanceType } from '@/lib/jira/jira-types';

const LOCAL_STORAGE_KEY = 'jiraConfig';

export default function JiraConfigPage() {
  const router = useRouter();
  const [instanceType, setInstanceType] = useState<JiraInstanceType>('server');
  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Load existing config if present
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const config: JiraConfig = JSON.parse(stored);
        setInstanceType(config.instanceType);
        setBaseUrl(config.baseUrl);
        if (config.instanceType === 'cloud' && config.basicAuth) {
          setEmail(config.basicAuth.email);
          setApiToken(config.basicAuth.apiToken);
        } else if (config.instanceType === 'server' && config.bearerToken) {
          setBearerToken(config.bearerToken);
        }
      } catch { }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!baseUrl) {
      setError('Jira URL is required');
      return;
    }
    if (instanceType === 'server' && !bearerToken) {
      setError('Personal Access Token is required for Jira Server');
      return;
    }
    if (instanceType === 'cloud' && (!email || !apiToken)) {
      setError('Email and API Token are required for Jira Cloud');
      return;
    }
    const config: JiraConfig = {
      instanceType,
      baseUrl,
      ...(instanceType === 'server'
        ? { bearerToken }
        : { basicAuth: { email, apiToken } })
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    setSuccess(true);
    setTimeout(() => {
      router.push('/');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold text-gray-900">Flow4Jira™ - Configure Jira Connection</h1>
        <p className="text-md text-gray-500">Configure your Jira credentials to connect to Jira</p>
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
            <h3 className="text-md text-gray-500 font-bold mb-2">🔒 How we handle your credentials</h3>
            <ul className="text-sm text-gray-500 mb-4">
              <li className="list-disc ml-4">Everything is stored locally in your browser only</li>
              <li className="list-disc ml-4">Nothing is sent to the server or database</li>
              <li className="list-disc ml-4">Only used to call Jira API directly from your browser</li>
              <li className="list-disc ml-4">You can revoke the token anytime in Jira settings</li>
            </ul>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Jira URL</label>
                <input type="text" className="mt-1 w-full border rounded px-3 py-2" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://your-domain.atlassian.net" />
              </div>
              <div>
                <label className="block text-sm font-medium">Instance Type</label>
                <select className="mt-1 w-full border rounded px-3 py-2" value={instanceType} onChange={e => setInstanceType(e.target.value as JiraInstanceType)}>
                  <option value="server">Server</option>
                  <option value="cloud">Cloud</option>
                </select>
              </div>
              {instanceType === 'server' ? (
                <div>
                  <label className="block text-sm font-medium">Personal Access Token</label>
                  <input type="text" className="mt-1 w-full border rounded px-3 py-2" value={bearerToken} onChange={e => setBearerToken(e.target.value)} placeholder="Enter your token" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input type="email" className="mt-1 w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">API Token</label>
                    <input type="text" className="mt-1 w-full border rounded px-3 py-2" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="Enter your API token" />
                  </div>
                </>
              )}
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {success && <div className="text-green-600 text-sm">Saved! Redirecting...</div>}
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded">Save</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
