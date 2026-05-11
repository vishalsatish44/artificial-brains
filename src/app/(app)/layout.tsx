import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main
        className="main-content"
        style={{ marginLeft: '260px', width: 'calc(100% - 260px)' }}
      >
        {children}
      </main>
    </div>
  );
}
