import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Pi,
  Library,
  Layers,
  Zap,
  ClipboardList,
  Award,
  MapPin,
  ChevronRight,
  User,
  Menu,
  X
} from 'lucide-react';
import WelcomeModal from './WelcomeModal';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [userClass, setUserClass] = useState('Dropper - IIT JEE');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false); // Close menu on navigation
  }, [location.pathname]);

  useEffect(() => {
    const updateUserData = () => {
      setUserName(localStorage.getItem('pw_user_name') || '');
      const cls = localStorage.getItem('pw_user_class');
      if (cls) setUserClass(cls);
    };
    updateUserData();
    window.addEventListener('storage', updateUserData);
    return () => window.removeEventListener('storage', updateUserData);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1F2937] font-sans flex flex-col">
      <WelcomeModal />
      
      {/* Top Header */}
      <header className="h-14 sm:h-16 flex items-center px-4 sm:px-6 border-b border-gray-200 bg-white/90 backdrop-blur-xl sticky top-0 z-40">
        <button 
          className="mr-3 p-1.5 lg:hidden text-gray-500 rounded-lg hover:bg-gray-100"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="flex items-center gap-2 sm:gap-3 mr-4 sm:mr-10 cursor-pointer" onClick={() => navigate('/')}>
          <img 
            src="https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS/3c122a7d-5f81-4226-8ec0-61712293d2eb.png" 
            alt="Physics Wallah" 
            className="h-8 sm:h-9 w-auto object-contain"
          />
          <span className="text-[18px] sm:text-[20px] font-black tracking-tight text-[#1F2937] hidden xs:block">Physics Wallah</span>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 pl-5 border-l border-gray-200">
            <span className="text-sm font-bold hidden sm:block">Hi, {userName || 'Student'}</span>
            <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
              <User size={18} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex max-w-[1500px] w-full mx-auto relative">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-200 overflow-y-auto pt-6 pb-10 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}>
          <div className="flex items-center justify-between px-6 mb-6 lg:hidden">
            <span className="font-bold text-lg">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 rounded-full bg-gray-50">
              <X size={20} />
            </button>
          </div>
          <div className="px-4">
            <div className="px-3 text-[11px] font-black tracking-widest text-[#9CA3AF] uppercase mb-3">
              Learn Online
            </div>
            <div className="space-y-1 text-[#4B5563] font-medium text-sm">
              <SidebarItem icon={GraduationCap} label="Study" path="/" active={location.pathname === '/'} />
              <SidebarItem icon={Layers} label="Batches" path="/batches" active={location.pathname === '/batches'} />
            </div>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 bg-white min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ 
  icon: Icon, 
  label, 
  path, 
  active, 
  badge 
}: { 
  icon: any; 
  label: string; 
  path: string; 
  active: boolean;
  badge?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-blue-50/80 text-blue-600 font-bold' 
          : 'hover:bg-gray-50 text-[#4B5563] font-medium hover:text-[#1F2937]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={active ? 'text-blue-600' : 'text-gray-400'} />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
          {badge}
        </span>
      )}
    </button>
  );
}
