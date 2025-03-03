import { ReactNode } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  // Don't show header on auth page
  if (router.pathname === '/auth') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            Log Processing Service
          </Link>
          {session && (
            <div className="flex items-center space-x-4">
              <span className="hidden md:inline">
                {session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-grow bg-gray-50">{children}</main>
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 text-center text-sm">
          &copy; {new Date().getFullYear()} Log Processing Microservice
        </div>
      </footer>
    </div>
  );
}