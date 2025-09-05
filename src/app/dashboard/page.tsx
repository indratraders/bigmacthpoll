'use client';

import { useEffect, useMemo, useState } from 'react';

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title?: string;
  options: PollOption[];
  totalVotes: number;
  totalDonations?: number;
  isActive?: boolean;
  goal?: number;
  matchDate?: string;
  venue?: string;
}

const DashboardPage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Load data function
  const loadData = () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('polls') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setPolls(parsed);
      }
    } catch {}

    try {
      const txRaw = typeof window !== 'undefined' ? localStorage.getItem('transactions') : null;
      if (txRaw) {
        const parsed = JSON.parse(txRaw);
        if (Array.isArray(parsed)) setTransactions(parsed);
      }
    } catch {}
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Real-time updates - refresh every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const totals = useMemo(() => {
    const totalVotes = polls.reduce((sum, p) => sum + (p.totalVotes || 0), 0);
    const totalDonations = transactions.reduce((sum, t) => sum + (t.donationAmount || 0), 0);
    return { totalVotes, totalDonations };
  }, [polls, transactions]);

  const downloadCSV = () => {
    const headers = ['name', 'supported_team', 'donation_amount', 'poll_title', 'timestamp'];
    const rows: string[][] = transactions.map((t) => [
      (t.voterName || '').replaceAll('"', '""'),
      (t.supportedTeam || '').replaceAll('"', '""'),
      String(t.donationAmount || 0),
      (t.pollTitle || '').replaceAll('"', '""'),
      t.timestamp || '',
    ]);

    const csv = [headers, ...rows]
      .map((cols) => cols.map((c) => `"${c}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transactions_export.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={downloadCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Download CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Votes</div>
            <div className="text-3xl font-bold">{totals.totalVotes}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Donations</div>
            <div className="text-3xl font-bold">Rs. {totals.totalDonations}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Submissions</div>
            <div className="text-3xl font-bold">{transactions.length}</div>
          </div>
        </div>

        {/* Team Results Section */}
        {polls.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Team Results</h2>
            <div className="space-y-4">
              {polls[0]?.options?.map((option, index) => {
                const percentage = polls[0].totalVotes > 0 ? 
                  (option.votes / polls[0].totalVotes) * 100 : 0;
                
                return (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">{option.text}</span>
                      <span className="text-xl font-bold text-blue-600">{option.votes} votes</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {percentage.toFixed(1)}% of total votes
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-sm text-gray-500 mt-4">
              💡 This poll updates in real-time as others vote!
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supported Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donation (Rs.)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poll</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{t.voterName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.supportedTeam}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{t.donationAmount}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.pollTitle}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;


