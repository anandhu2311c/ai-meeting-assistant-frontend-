'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    
    if (token) {
      // If logged in, redirect to meeting page
      router.push('/meeting');
    } else {
      // If not logged in, redirect to login page
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-lg">Redirecting...</div>
    </div>
  );
}