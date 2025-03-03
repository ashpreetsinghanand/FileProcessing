import { useState } from 'react';
import { LogStats } from '@/lib/supabase';

interface StatsTableProps {
  stats: LogStats[];
  isLoading: boolean;
}

export default function StatsTable({ stats, isLoading }: StatsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return ms + ' ms';
    if (ms < 60000) return (ms / 1000).toFixed(2) + ' seconds';
    return (ms / 60000).toFixed(2) + ' minutes';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Log Processing Results</h2>
        <div className="flex justify-center items-center h-40">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Log Processing Results</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No log files have been processed yet.</p>
          <p className="mt-2">Upload a log file to see results here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Log Processing Results</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lines
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Errors
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Warnings
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Processed At
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.map((stat) => (
              <React.Fragment key={stat.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{stat.file_name}</div>
                    <div className="text-sm text-gray-500">{formatFileSize(stat.file_size)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(stat.status)}`}>
                      {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.total_lines.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.error_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.warning_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(stat.updated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => toggleRow(stat.id)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      {expandedRow === stat.id ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
                {expandedRow === stat.id && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Processing Details</h3>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li><span className="font-medium">Job ID:</span> {stat.job_id}</li>
                            <li><span className="font-medium">Processing Time:</span> {formatProcessingTime(stat.processing_time)}</li>
                            <li><span className="font-medium">Created:</span> {formatDate(stat.created_at)}</li>
                            <li><span className="font-medium">Updated:</span> {formatDate(stat.updated_at)}</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Keyword Matches</h3>
                          {Object.keys(stat.keyword_matches).length > 0 ? (
                            <ul className="text-sm text-gray-600 space-y-1">
                              {Object.entries(stat.keyword_matches)
                                .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                                .map(([keyword, count]) => (
                                  <li key={keyword}>
                                    <span className="font-medium">{keyword}:</span> {count}
                                  </li>
                                ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No keyword matches found</p>
                          )}
                        </div>
                        
                        <div className="md:col-span-2">
                          <h3 className="text-sm font-semibold mb-2">IP Addresses</h3>
                          {Object.keys(stat.ip_addresses).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(stat.ip_addresses)
                                .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                                .slice(0, 15) // Show only top 15 IPs
                                .map(([ip, count]) => (
                                  <div key={ip} className="text-sm">
                                    <span className="font-medium">{ip}:</span> {count}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No IP addresses found</p>
                          )}
                          {Object.keys(stat.ip_addresses).length > 15 && (
                            <p className="text-sm text-gray-500 mt-2">
                              Showing top 15 of {Object.keys(stat.ip_addresses).length} IP addresses
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}