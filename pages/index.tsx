import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import FileUploader from '@/components/FileUploader';
import StatsTable from '@/components/StatsTable';
import QueueStatus from '@/components/QueueStatus';
import { LogStats } from '@/lib/supabase';

interface HomeProps {
  socket: Socket | null;
}

export default function Home({ socket }: HomeProps) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [stats, setStats] = useState<LogStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      router.push('/auth');
    }
  }, [session, router]);

  // Fetch initial stats
  useEffect(() => {
    if (session) {
      fetchStats();
      fetchQueueStatus();
    }
  }, [session]);

  // Set up socket listeners
  useEffect(() => {
    if (!socket || !session) return;

    // Join user-specific room
    socket.emit('join', { userId: session.user.id });

    // Listen for job progress updates
    socket.on('job-progress', (data) => {
      console.log('Job progress:', data);
      // Update the stats for this job
      setStats((prevStats) => {
        const updatedStats = [...prevStats];
        const index = updatedStats.findIndex((s) => s.job_id === data.jobId);
        
        if (index !== -1) {
          updatedStats[index] = {
            ...updatedStats[index],
            total_lines: data.stats.totalLines,
            error_count: data.stats.errorCount,
            warning_count: data.stats.warningCount,
            keyword_matches: data.stats.keywordMatches,
            ip_addresses: data.stats.ipAddresses,
          };
        }
        
        return updatedStats;
      });
    });

    // Listen for job completion
    socket.on('job-completed', (data) => {
      console.log('Job completed:', data);
      toast.success(`File ${data.fileName} processed successfully!`);
      fetchStats();
      fetchQueueStatus();
    });

    // Listen for job failures
    socket.on('job-failed', (data) => {
      console.error('Job failed:', data);
      toast.error(`Failed to process ${data.fileName}: ${data.error}`);
      fetchStats();
      fetchQueueStatus();
    });

    // Clean up listeners on unmount
    return () => {
      socket.off('job-progress');
      socket.off('job-completed');
      socket.off('job-failed');
      socket.emit('leave', { userId: session.user.id });
    };
  }, [socket, session]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('log_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch log statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/queue-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch queue status');
      const data = await response.json();
      setQueueStatus(data);
    } catch (error) {
      console.error('Error fetching queue status:', error);
    }
  };

  const handleUploadSuccess = (jobId: string) => {
    toast.success('File uploaded and queued for processing!');
    fetchStats();
    fetchQueueStatus();
  };

  if (!session) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Log Processing Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <FileUploader onUploadSuccess={handleUploadSuccess} />
        </div>
        <div>
          <QueueStatus status={queueStatus} />
        </div>
      </div>
      
      <StatsTable stats={stats} isLoading={isLoading} />
    </div>
  );
}