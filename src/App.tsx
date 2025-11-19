import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/pages/Dashboard';
import { Stock } from '@/pages/Stock';
import { Suppliers } from '@/pages/Suppliers';
import { Customers } from '@/pages/Customers';
import { Reserves } from '@/pages/Reserves';
import { Sales } from '@/pages/Sales';
import { Reports } from '@/pages/Reports';
import { Toaster } from '@/components/ui/sonner';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'stock':
        return <Stock />;
      case 'suppliers':
        return <Suppliers />;
      case 'customers':
        return <Customers />;
      case 'reserves':
        return <Reserves />;
      case 'sales':
        return <Sales />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <AppContent />
      <Toaster position="top-right" richColors />
    </>
  );
}
