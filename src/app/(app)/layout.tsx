'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { AiChat } from '@/components/AiChat';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  return (
    <div className="dashboard-container">
      <Sidebar isHovered={isSidebarHovered} setIsHovered={setIsSidebarHovered} />
      <main
        className="main-content"
        style={{ 
          marginLeft: isSidebarHovered ? '260px' : '72px', 
          width: `calc(100% - ${isSidebarHovered ? '260px' : '72px'})`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </main>
      <AiChat />
    </div>
  );
}
