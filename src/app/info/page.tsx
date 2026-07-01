'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JiraConfig, JiraInstanceType } from '@/lib/jira/jira-types';
import Link from 'next/link';

const LOCAL_STORAGE_KEY = 'jiraConfig';

export default function InfoPage() {


  return (
    <div className="min-h-screen bg-gray-50 p-8">


      <div className="flex justify-between items-center">
        <div className="max-w-4xl mx-auto">
          {/* Header with Navigation */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link href="/" className="hover:text-blue-600">
                Boards
              </Link>
              <span>/</span>
              <span className="text-gray-900">About</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">About Flow4Jira</h1>
          <p className="text-md text-gray-500 mt-6">Flow4Jira is a web app to create actionable flow metrics visualizations based on Jira boards. </p>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Data security & privacy</h2>
          <ul className="text-md text-gray-500 mb-4">
            <li className="list-disc ml-4">Everything is stored locally in your browser only</li>
            <li className="list-disc ml-4">Nothing is sent to the server or database</li>
            <li className="list-disc ml-4">Only used to call Jira API directly from your browser</li>
            <li className="list-disc ml-4">You can revoke the token anytime in Jira settings</li>
          </ul>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Copyright</h2>
          <p className="text-md text-gray-500">Flow4Jira is free and licensed under Apache 2.0 open source license.</p>
          <p className="text-md text-gray-500">Copyright 2025-2026 Sandor Hibsch </p>
          <p className="text-md text-gray-500"><a className="text-blue-500" href="https://github.com/sandorhibsch/flow4jira">See on GitHub</a></p>
        </div>
      </div>
    </div>


  );
}
