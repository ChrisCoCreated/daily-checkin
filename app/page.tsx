import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Daily Check-In Service
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Automated daily wellbeing check-in calls with AI-powered analysis
        </p>
        
        <div className="space-y-4">
          <Link
            href="/admin"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-medium"
          >
            View Admin Dashboard
          </Link>
          
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

