import React from 'react';

interface QueueStatusProps {
  status: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
}

export default function QueueStatus({ status }: QueueStatusProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <h2 className="text-xl font-semibold mb-4">Queue Status</h2>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Active Jobs</span>
            <span className="text-sm font-semibold text-primary-600">{status.active}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full"
              style={{ width: `${status.total > 0 ? (status.active / status.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Waiting Jobs</span>
            <span className="text-sm font-semibold text-yellow-600">{status.waiting}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full"
              style={{ width: `${status.total > 0 ? (status.waiting / status.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Completed Jobs</span>
            <span className="text-sm font-semibold text-green-600">{status.completed}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${status.total > 0 ? (status.completed / status.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Failed Jobs</span>
            <span className="text-sm font-semibold text-red-600">{status.failed}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full"
              style={{ width: `${status.total > 0 ? (status.failed / status.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total Jobs</span>
          <span className="text-sm font-bold">{status.total}</span>
        </div>
      </div>
    </div>
  );
}