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
            src="https://th.bing.com/th/id/OIP.8vIGm3BuOD31_XaWr2FhMgHaHa?w=175&h=180&c=7&r=0&o=7&pid=1.7&rm=3" 
            alt="AlManer" 
            className="h-10 sm:h-12 w-10 sm:w-12 object-contain rounded-full border-2 border-blue-500/20 shadow-sm"
          />
          <span className="text-[18px] sm:text-[20px] font-black tracking-tight text-[#1F2937] hidden xs:block">AlManer</span>
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
      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-200 overflow-y-auto pt-6 pb-10 transition-all duration-300 
          lg:static lg:translate-x-0 
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
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
              <div className="flex items-center gap-3 px-3 py-3 text-gray-400 cursor-not-allowed">
                <Zap size={20} />
                <span className="text-sm font-medium">Dark Mode <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded ml-1">Coming Soon</span></span>
              </div>
            </div>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 bg-white min-w-0">
          {children}
          
          {/* Global Footer */}
          <footer className="bg-white border-t border-gray-100 pt-10 pb-6 px-4">
            <div className="max-w-[1240px] mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 pb-8 border-b border-gray-100">
                {/* Col 1 — Brand */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <img src="https://th.bing.com/th/id/OIP.8vIGm3BuOD31_XaWr2FhMgHaHa?w=175&h=180&c=7&r=0&o=7&pid=1.7&rm=3" alt="AlManer" className="h-10 w-10 rounded-full" />
                    <span className="text-xl font-black">AlManer</span>
                  </div>
                  <p className="text-xs text-[#6B7280] font-medium leading-relaxed mb-4">
                    Providing quality education at the most affordable prices. AlManer (Physics Wala branding) is committed to your success.
                  </p>
                  <p className="text-xs font-bold text-[#4B5563] mb-2 font-black italic">Physics Wala Branding</p>
                  <div className="flex gap-2.5">
                    {[
                      { bg: '#1877F2', label: 'f' },
                      { bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', label: '◎' },
                      { bg: '#FF0000', label: '▶' },
                      { bg: '#0A66C2', label: 'in' },
                    ].map((s, i) => (
                      <button key={i} className="w-8 h-8 rounded-full text-white text-xs flex items-center justify-center font-bold hover:scale-110 transition-transform flex-shrink-0" style={{ background: s.bg }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Col 2 */}
                <div>
                  <h4 className="font-black text-sm mb-4 text-[#1F2937]">Company</h4>
                  {['About Us', 'Contact Us', 'Careers'].map(l => (
                    <a key={l} href="#" className="block text-xs text-[#6B7280] hover:text-[#5A4BDA] font-medium mb-2.5 transition-colors">{l}</a>
                  ))}
                </div>

                {/* Col 3 */}
                <div>
                  <h4 className="font-black text-sm mb-4 text-[#1F2937]">Quick Links</h4>
                  {['Study', 'Batches', 'Admin'].map(l => (
                    <a key={l} href="#" className="block text-xs text-[#6B7280] hover:text-[#5A4BDA] font-medium mb-2.5 transition-colors">{l}</a>
                  ))}
                </div>

                {/* Col 4 */}
                <div>
                  <h4 className="font-black text-sm mb-4 text-[#1F2937]">Support</h4>
                  <p className="text-xs text-[#6B7280] font-medium">Email: support@almaner.com</p>
                  <p className="text-xs text-[#6B7280] font-medium mt-1">Phone: +91 9999999999</p>
                </div>
              </div>
              <p className="text-center text-xs text-[#9CA3AF] mt-6">Copyright © 2025 AlManer (Physicswallah Clone). All rights reserved.</p>
            </div>
          </footer>
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
