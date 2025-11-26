'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function sendTestCheckin() {
    try {
      setSendingTest(true);
      setTestMessage(null);
      
      const response = await fetch('/api/call/start', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start test check-in');
      }
      
      setTestMessage({
        type: 'success',
        text: `Test check-in call initiated! Call ID: ${data.callId?.substring(0, 12)}...`,
      });
    } catch (err) {
      setTestMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send test check-in',
      });
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Daily Check-In Service
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Automated daily wellbeing check-in calls with AI-powered analysis
        </p>
        
        {testMessage && (
          <div
            className={`mb-4 p-4 border rounded-lg ${
              testMessage.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p
              className={
                testMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
              }
            >
              {testMessage.text}
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <Link
            href="/admin"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-medium"
          >
            View Admin Dashboard
          </Link>
          
          <button
            onClick={sendTestCheckin}
            disabled={sendingTest}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {sendingTest ? 'Sending Test Check-In...' : 'Send Test Check-In'}
          </button>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold text-gray-900 mb-2">API Endpoints</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <code className="bg-gray-200 px-2 py-1 rounded">POST /api/call/start</code> - Manually trigger a check-in call
              </li>
              <li>
                <code className="bg-gray-200 px-2 py-1 rounded">GET /api/admin/checkins</code> - Get all check-in records
              </li>
              <li>
                <code className="bg-gray-200 px-2 py-1 rounded">POST /api/analysis</code> - Analyze a transcript
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
