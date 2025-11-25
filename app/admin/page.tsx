'use client';

import { useEffect, useState } from 'react';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Daily Check-In Logs</h1>
          <p className="mt-2 text-gray-600">View all check-in call records and analysis</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
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
                      Transcript
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keywords
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {checkins.map((checkin) => (
                    <tr key={checkin.id} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {checkin.needs_escalation ? (
                          <div>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Yes
                            </span>
                            {checkin.escalation_reason && (
                              <p className="mt-1 text-xs text-gray-600">
                                {checkin.escalation_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        <p className="truncate">
                          {checkin.transcript || (
                            <span className="text-gray-400 italic">No transcript</span>
                          )}
                        </p>
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
                    </tr>
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

