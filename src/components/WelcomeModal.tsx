import React, { useState, useEffect } from 'react';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('pw_user_name');
    if (!storedName) {
      setIsOpen(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('pw_user_name', name.trim());
      // Default class so Layout doesn't break if it expects it
      if (!localStorage.getItem('pw_user_class')) {
        localStorage.setItem('pw_user_class', 'Dropper - IIT JEE');
      }
      setIsOpen(false);
      window.dispatchEvent(new Event('storage'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000A1F]/60 backdrop-blur-md p-4">
      <div className="bg-[#000A1F] border border-white/10 rounded-[28px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-2xl text-white shadow-xl">
              PW
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">Welcome to PW</h2>
          <p className="text-white/40 font-medium text-sm">Let's get started with your name</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-6">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold placeholder:text-white/20"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-base shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
          >
            Enter Now
          </button>
        </form>
      </div>
    </div>
  );
}
