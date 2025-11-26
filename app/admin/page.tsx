'use client';

import { Fragment, useEffect, useState } from 'react';
import { format } from 'date-fns';

interface Checkin {
  id: string;
  call_id: string;
  call_time: string;
  transcript: string | null;
  sentiment: string | null;
  risk_level: string | null;
  keywords: string[] | null;
  needs_escalation: boolean;
  escalation_reason: string | null;
  responded: boolean;
}

export default function AdminPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  async function handleLogout() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  useEffect(() => {
    fetchCheckins();
  }, []);

  async function fetchCheckins() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/checkins');
      if (!response.ok) {
        throw new Error('Failed to fetch checkins');
      }
      const data = await response.json();
      setCheckins(data.checkins || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

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
      
      // Refresh check-ins after a short delay to see the new entry
      setTimeout(() => {
        fetchCheckins();
      }, 2000);
    } catch (err) {
      setTestMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send test check-in',
      });
    } finally {
      setSendingTest(false);
    }
  }

  function getRiskColor(risk: string | null): string {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getSentimentColor(sentiment: string | null): string {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-400';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Check-In Logs</h1>
            <p className="mt-2 text-gray-600">View all check-in call records and analysis</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={sendTestCheckin}
              disabled={sendingTest}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {sendingTest ? 'Sending...' : 'Send Test Check-In'}
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading check-ins...</p>
          </div>
        ) : checkins.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No check-ins found</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Escalation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keywords
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transcript
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {checkins.map((checkin) => (
                    <Fragment key={checkin.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(checkin.call_time), 'MMM d, yyyy h:mm a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {checkin.call_id.substring(0, 12)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              checkin.responded
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {checkin.responded ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getSentimentColor(checkin.sentiment)}>
                            {checkin.sentiment || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {checkin.risk_level && (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskColor(
                                checkin.risk_level
                              )}`}
                            >
                              {checkin.risk_level}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm w-48 align-top">
                          {checkin.needs_escalation ? (
                            <div className="space-y-1">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Yes
                              </span>
                              {checkin.escalation_reason && (
                                <p className="text-xs text-gray-600 break-words whitespace-normal">
                                  {checkin.escalation_reason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {checkin.keywords && checkin.keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {checkin.keywords.slice(0, 5).map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {keyword}
                                </span>
                              ))}
                              {checkin.keywords.length > 5 && (
                                <span className="text-xs text-gray-500">
                                  +{checkin.keywords.length - 5}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {checkin.transcript ? (
                            <button
                              onClick={() =>
                                setExpandedTranscript(
                                  expandedTranscript === checkin.id ? null : checkin.id
                                )
                              }
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {expandedTranscript === checkin.id ? 'Hide' : 'View'} Transcript
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">No transcript</span>
                          )}
                        </td>
                      </tr>
                      {checkin.transcript && expandedTranscript === checkin.id && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50 px-6 pb-6 pt-0">
                            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-inner">
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                {checkin.transcript}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 text-right">
          <button
            onClick={fetchCheckins}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

