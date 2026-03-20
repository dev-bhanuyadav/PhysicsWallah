import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Menu, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';

/* ════════════════════════════════════════════════════════
   REAL PW.LIVE CDN ASSETS
   ════════════════════════════════════════════════════════ */
const CDN  = 'https://static.pw.live';
const NEXT = 'https://www.pw.live/_next/static/media';
const G    = `${CDN}/5eb393ee95fab7468a79d189/GLOBAL_CMS`;
const B    = `${CDN}/5b09189f7285894d9130ccd0`;

const IMG = {
  logo:          `${G}/3c122a7d-5f81-4226-8ec0-61712293d2eb.png`,
  heroBg:        `${CDN}/ua/images/compress_background.webp`,
  studentGirl:   `${CDN}/ua/images/hero-student-w.webp`,
  studentBoy:    `${CDN}/ua/images/hero-student-m.webp`,
  callIcon:      `${NEXT}/call_4x.225f7249.webp`,
  googlePlay:    `${NEXT}/google-play-badge.171251c3.webp`,
  appStore:      `${NEXT}/apple-store-badge.acb101ce.webp`,
  otpBadge:      `${CDN}/auth-fe/assets/images/pw_badge_v2_otp.webp`,
  otpSvg:        `${CDN}/auth-fe/assets/images/otp_badge.svg`,
  closeIcon:     `${CDN}/auth-fe/assets/images/v2_close_icon.webp`,
  blueTick:      `${NEXT}/blue-tick.21fd7914.webp`,
  comma:         `${NEXT}/comma.fcbeaa74.webp`,
  // Feature strip icons
  featLive:      `${B}/1f23db31-6da9-4ed1-93fe-baea21bad40b.webp`,
  featTests:     `${B}/ba8452a1-91d3-45e8-862a-e23ec4c25b3f.webp`,
  featDoubt:     `${B}/ede9393f-c1b4-4d21-beee-597be35b9f15.webp`,
  featCentre:    `${B}/3d53d72c-a091-496f-b771-e8c5336ca9e3.webp`,
  // Exam category images
  catNeet:       `${B}/165756ec-8d87-4a09-9a88-95c342adddea.webp`,
  catJee:        `${B}/ee478abe-a66b-4529-a264-16b61ffb6c51.webp`,
  catUpsc:       `${G}/002e5e6e-47f1-4b21-89e0-8218ffcce066.webp`,
  catGovt:       `${G}/8556a2c4-1fd3-4d16-bdfb-62f4afa21310.webp`,
  catFoundation: `${G}/ed50a2a8-e5fc-4ce0-bcee-823c32ea49e9.webp`,
  // Hero banners
  banner1:       `${G}/b786089d-1894-4a34-92bb-89eb9b1280be.webp`,
  banner2:       `${G}/27ec202b-cffe-4679-9310-480f8f626caf.jpg`,
  banner3:       `${G}/36e82621-8e27-4181-ae03-ae36c7aa5fc5.jpg`,
};

/* ════════════════════════════════════════════════════════
   REAL OTP API
   ════════════════════════════════════════════════════════ */
const ORG_ID = '5eb393ee95fab7468a79d189';
const PW_HEADERS = {
  'Content-Type': 'application/json',
  'client-type': 'WEB',
  'client-id': ORG_ID,
};

async function sendOtp(phone: string) {
  try {
    const res = await fetch(`/pw-api/v1/users/get-otp?smsType=0&fallback=true`, {
      method: 'POST', headers: PW_HEADERS,
      body: JSON.stringify({ username: phone, countryCode: '+91', organizationId: ORG_ID }),
    });
    const d = await res.json();
    return (res.ok && (d.success || d.statusCode === 200))
      ? { ok: true } : { ok: false, msg: d.message || 'Failed to send OTP' };
  } catch { return { ok: false, msg: 'Network error. Try again.' }; }
}

async function verifyOtp(phone: string, otp: string) {
  try {
    const res = await fetch(`/pw-api/v3/oauth/token`, {
      method: 'POST', headers: PW_HEADERS,
      body: JSON.stringify({
        username: phone, otp, grant_type: 'password',
        client_id: 'system-admin', client_secret: 'KjPXuAVfC5xbmgreETNMaL7z',
        organizationId: ORG_ID, latitude: 0, longitude: 0,
      }),
    });
    const d = await res.json();
    return d.data?.access_token
      ? { ok: true, token: d.data.access_token }
      : { ok: false, msg: d.message || 'Invalid OTP. Try again.' };
  } catch { return { ok: false, msg: 'Network error. Try again.' }; }
}

/* ════════════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════════════ */
const NAV_LINKS = ['Vidyapeeth', 'Upskilling', 'PW Store (Books)', 'Real Test', 'Class 1st - 8th', 'Power Batch'];

const EXAM_CATS = [
  { name: 'NEET', img: IMG.catNeet, pills: ['Class 11', 'Class 12', 'Dropper'], bg: '#FFF1F2' },
  { name: 'IIT JEE', img: IMG.catJee, pills: ['Class 11', 'Class 12', 'Dropper'], bg: '#FFFBEB' },
  { name: 'UPSC CSE', img: IMG.catUpsc, pills: ['GS', 'Optional', 'Interview'], bg: '#F0FDF4' },
  { name: 'Govt Job Exams', img: IMG.catGovt, pills: ['Railway', 'Banking', 'SSC'], bg: '#EFF6FF' },
  { name: 'Pre Foundation', img: IMG.catFoundation, pills: ['Class 6', 'Class 7', 'Class 8'], bg: '#FDF4FF' },
  { name: 'School Boards', img: IMG.catFoundation, pills: ['Class 9', 'Class 10', 'Class 12'], bg: '#F0FDFA' },
];

const CITIES = [
  { name: 'Kota', img: `${G}/36e82621-8e27-4181-ae03-ae36c7aa5fc5.jpg` },
  { name: 'Bareilly', img: `${G}/b786089d-1894-4a34-92bb-89eb9b1280be.webp` },
  { name: 'Patna', img: `${G}/27ec202b-cffe-4679-9310-480f8f626caf.jpg` },
  { name: 'Noida', img: `${G}/36e82621-8e27-4181-ae03-ae36c7aa5fc5.jpg` },
  { name: 'New Delhi', img: `${G}/b786089d-1894-4a34-92bb-89eb9b1280be.webp` },
  { name: 'Kolkata', img: `${G}/27ec202b-cffe-4679-9310-480f8f626caf.jpg` },
  { name: 'Ahmedabad', img: `${G}/36e82621-8e27-4181-ae03-ae36c7aa5fc5.jpg` },
  { name: 'Jaipur', img: `${G}/b786089d-1894-4a34-92bb-89eb9b1280be.webp` },
];

const RESULT_TABS = ['UPSC CSE', 'GATE', 'Board Exams - CBSE 10th', 'Board Exams - ICSE 10th', 'Board Exams - CBSE 12th', 'CA', 'MBA', 'SSC', 'IIT JAM'];

const STATS = [
  { num: '15 Million+', label: 'Students', color: '#5A4BDA', bg: '#EEF2FF' },
  { num: '14000+', label: 'Video Lectures', color: '#0891B2', bg: '#E0F7FA' },
  { num: '80000+', label: 'Practice Papers', color: '#7C3AED', bg: '#F3E8FF' },
  { num: '24000+', label: 'Mock Tests', color: '#DB2777', bg: '#FDF2F8' },
];

/* ════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════ */
export default function Home() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen]   = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [slide, setSlide]           = useState(0);
  const [resultTab, setResultTab]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  /* Login state */
  const [step, setStep]     = useState<'phone'|'otp'>('phone');
  const [phone, setPhone]   = useState('');
  const [digits, setDigits] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [resend, setResend] = useState(0);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % 3), 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (resend <= 0) return;
    const t = setTimeout(() => setResend(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resend]);

  const openLogin  = () => { setLoginOpen(true); resetLogin(); };
  const resetLogin = () => { setStep('phone'); setPhone(''); setDigits(['','','','','','']); setLoading(false); setError(''); setResend(0); };
  const closeLogin = () => { setLoginOpen(false); resetLogin(); };
  const skipLogin  = () => { closeLogin(); navigate('/batches'); };
  const otp = digits.join('');

  const handleSendOtp = async () => {
    if (phone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    const r = await sendOtp(phone);
    setLoading(false);
    if (r.ok) { setStep('otp'); setResend(30); }
    else setError((r as any).msg);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    const r = await verifyOtp(phone, otp);
    setLoading(false);
    if (r.ok) {
      if ((r as any).token) sessionStorage.setItem('pw_token', (r as any).token);
      sessionStorage.setItem('pw_auth', '1');
      closeLogin(); navigate('/batches');
    } else setError((r as any).msg);
  };

  const handleResend = async () => {
    if (resend > 0) return;
    const r = await sendOtp(phone);
    if (r.ok) setResend(30);
    else setError((r as any).msg);
  };

  const handleDigit = (i: number, val: string) => {
    const c = val.replace(/\D/g, '');
    if (c.length > 1) {
      const arr = c.slice(0,6).split('');
      const n = ['','','','','',''];
      arr.forEach((d,idx) => { n[idx] = d; });
      setDigits(n);
      document.getElementById(`d${Math.min(5, arr.length-1)}`)?.focus();
      return;
    }
    const n = [...digits]; n[i] = c; setDigits(n);
    if (c && i < 5) document.getElementById(`d${i+1}`)?.focus();
  };

  const handleBksp = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      document.getElementById(`d${i-1}`)?.focus();
      const n = [...digits]; n[i-1] = ''; setDigits(n);
    }
  };

  /* BANNER slides */
  const banners = [
    { img: IMG.banner1, tag: 'Achieve Your JEE Aim With Us!', title: 'JEE BATCHES', sub: 'FOR CLASS 11TH, 12TH, JEE & DROPPERS', dark: true },
    { img: IMG.banner2, tag: 'NEET Conquer the Medical Exam!', title: 'NEET BATCHES', sub: 'FOR CLASS 11TH, 12TH & DROPPERS', dark: true },
    { img: IMG.banner3, tag: 'Boost your ACCA Prep!', title: 'ACCA BATCHES', sub: 'KNOWLEDGE | SKILL | PROFESSIONAL', dark: false },
  ];

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif] text-[#1F2937]">

      {/* ══ NAV ══════════════════════════════════════════════ */}
      <nav className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'border-b border-gray-100'}`}>
        <div className="max-w-[1200px] mx-auto px-4 flex items-center h-[64px] gap-3">
          <img src={IMG.logo} alt="Physics Wallah" className="h-10 w-auto cursor-pointer flex-shrink-0" onClick={() => navigate('/')} />

          <button className="hidden lg:flex items-center gap-1.5 border border-[#5A4BDA]/50 text-[#5A4BDA] font-bold text-[13px] px-4 py-2 rounded-lg bg-[#F5F3FF] hover:bg-[#EDE9FE] transition-all flex-shrink-0">
            All Courses <ChevronDown size={13} />
          </button>

          <div className="hidden xl:flex flex-1 gap-0.5">
            {NAV_LINKS.map(l => (
              <a key={l} href="#" className="px-3 py-2 text-[13px] font-semibold text-[#374151] hover:text-[#5A4BDA] hover:bg-[#F5F3FF] rounded-lg transition-all whitespace-nowrap">
                {l}
              </a>
            ))}
          </div>
          <div className="flex-1 xl:hidden" />
          <button onClick={openLogin} className="hidden sm:block bg-[#5A4BDA] text-white text-[14px] font-bold px-6 py-2.5 rounded-xl hover:bg-[#4B3EBF] active:scale-95 transition-all flex-shrink-0">
            Login/Register
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="xl:hidden p-2 text-gray-600">
            {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
        {mobileOpen && (
          <div className="xl:hidden bg-white border-t px-4 py-3 flex flex-col gap-1 shadow-xl">
            {NAV_LINKS.map(l => <a key={l} href="#" className="py-3 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">{l}</a>)}
            <button onClick={() => { openLogin(); setMobileOpen(false); }} className="mt-2 bg-[#5A4BDA] text-white py-3.5 rounded-xl font-bold">Login / Register</button>
          </div>
        )}
      </nav>
      <div className="h-[64px]" />

      {/* ══ HERO BANNER CAROUSEL ═════════════════════════════ */}
      <div className="px-4 py-3 bg-[#EBF0FF]">
        <div className="max-w-[1200px] mx-auto">
          <div className="relative rounded-[16px] overflow-hidden h-[200px] sm:h-[280px]">
            {banners.map((b, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <img src={b.img} alt={b.title} className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex flex-col justify-center px-8 sm:px-14">
                  <p className={`text-xs sm:text-sm font-semibold mb-2 ${b.dark ? 'text-white/80' : 'text-yellow-300'}`}>{b.tag}</p>
                  <h2 className="text-white text-2xl sm:text-4xl font-black uppercase mb-2">{b.title}</h2>
                  <p className="text-white/70 text-xs sm:text-sm font-bold mb-4 border border-white/40 inline-block px-3 py-1 rounded-full w-fit">{b.sub}</p>
                  <button onClick={() => navigate('/batches')} className="border-2 border-white text-white text-xs sm:text-sm font-black px-6 py-2 rounded-lg hover:bg-white hover:text-[#5A4BDA] transition-all w-fit tracking-widest">
                    EXPLORE BATCHES!
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {[0,1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
              <button key={i} onClick={() => i < 3 ? setSlide(i) : undefined}
                className={`rounded-full transition-all ${i === slide ? 'w-4 h-2 bg-[#5A4BDA]' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══ TRUSTED SECTION ══════════════════════════════════ */}
      <section
        className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg,#EEF0FF 0%,#F5F3FF 40%,#EEF5FF 100%)' }}
      >
        <div className="max-w-[1200px] mx-auto text-center">
          <h1 className="text-[26px] sm:text-[40px] font-black leading-tight mb-3">
            Bharat's <span className="text-[#5A4BDA]">Trusted &amp; Affordable</span> Educational Platform
          </h1>
          <p className="text-[#6B7280] text-[15px] sm:text-lg font-medium mb-8">
            Unlock your potential by signing up with Physics Wallah-The most affordable learning solution
          </p>
          <button onClick={openLogin} className="bg-[#5A4BDA] text-white px-12 py-3.5 rounded-xl font-bold text-lg hover:bg-[#4B3EBF] active:scale-95 transition-all shadow-lg shadow-[#5A4BDA]/20 mb-0">
            Get Started
          </button>
        </div>
        {/* Student illustrations positioned absolutely */}
        <div className="max-w-[900px] mx-auto relative h-[260px] sm:h-[320px] mt-4">
          {/* Dashed circles */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] rounded-full border-2 border-dashed border-[#5A4BDA]/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] rounded-full border border-dashed border-[#5A4BDA]/10" />
          {/* Dots */}
          <div className="absolute left-[20%] top-[20%] w-3 h-3 rounded-full bg-[#5A4BDA]/60" />
          <div className="absolute right-[22%] top-[30%] w-2.5 h-2.5 rounded-full bg-orange-400/70" />
          <div className="absolute left-[30%] bottom-[20%] w-2 h-2 rounded-full bg-cyan-400/70" />
          {/* Boy */}
          <img src={IMG.studentBoy} alt="Student" className="absolute bottom-0 left-[10%] sm:left-[15%] h-[180px] sm:h-[230px] object-contain" />
          {/* Boy speech bubble */}
          <div className="absolute left-[22%] sm:left-[27%] top-[30%] bg-[#5A4BDA] text-white text-xs font-semibold px-3 py-2 rounded-xl max-w-[140px] leading-snug shadow-lg">
            PW is where students learn with love and can grow with guidance
            <div className="absolute -bottom-2 left-4 w-4 h-2 overflow-hidden">
              <div className="w-4 h-4 bg-[#5A4BDA] rotate-45 -mt-2 -ml-0.5" />
            </div>
          </div>
          {/* Girl */}
          <img src={IMG.studentGirl} alt="Student" className="absolute bottom-0 right-[10%] sm:right-[15%] h-[200px] sm:h-[260px] object-contain" />
          {/* Girl speech bubble */}
          <div className="absolute right-[22%] sm:right-[28%] top-[10%] bg-white text-gray-800 text-xs font-semibold px-3 py-2 rounded-xl max-w-[130px] shadow-lg border border-gray-100">
            Alakh Sir, What is PW?
            <div className="absolute -bottom-2 right-4 w-4 h-2 overflow-hidden">
              <div className="w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45 -mt-2 -ml-0.5" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURE STRIP ════════════════════════════════════ */}
      <section className="bg-white px-4 py-0">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-4 border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
            {[
              { img: IMG.featLive,   label: 'Daily Live',   sub: 'Interactive classes' },
              { img: IMG.featTests,  label: '10 Million +', sub: 'Tests, sample papers & notes' },
              { img: IMG.featDoubt,  label: '24 x 7',       sub: 'Doubt solving sessions' },
              { img: IMG.featCentre, label: '100 +',        sub: 'Offline centres' },
            ].map((f, i) => (
              <div key={i} className={`flex flex-col items-center gap-3 py-6 px-3 bg-white ${i < 3 ? 'border-r border-gray-100' : ''}`}>
                <img src={f.img} alt={f.label} className="w-14 h-14 object-contain" />
                <div className="text-center">
                  <p className="font-black text-[15px] sm:text-lg text-[#1F2937]">{f.label}</p>
                  <p className="text-[10px] sm:text-xs text-[#9CA3AF] font-medium mt-0.5 leading-snug">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ EXAM CATEGORIES ══════════════════════════════════ */}
      <section className="bg-[#F5F5F5] py-12 px-4 mt-6">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[26px] sm:text-[32px] font-black text-center mb-1">Exam Categories</h2>
          <p className="text-[#5A4BDA] text-sm font-semibold text-center mb-8">
            PW is preparing students for 35+ exam categories. Scroll down to find the one you are preparing for
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXAM_CATS.map((cat, i) => (
              <button
                key={i}
                onClick={() => navigate('/batches')}
                className="group flex items-center justify-between bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-[#5A4BDA]/20 transition-all p-5 text-left"
              >
                <div className="flex-1">
                  <h3 className="font-black text-lg text-[#1F2937] mb-3">{cat.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cat.pills.map(p => (
                      <span key={p} className="border border-gray-200 text-[#4B5563] text-xs font-medium px-3 py-1 rounded-full">{p}</span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-[#1F2937] font-semibold text-sm group-hover:text-[#5A4BDA] transition-colors">
                    Explore Category <ArrowRight size={14} />
                  </span>
                </div>
                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center ml-4 overflow-hidden rounded-xl" style={{ background: cat.bg }}>
                  <img src={cat.img} alt={cat.name} className="w-20 h-20 object-contain" />
                </div>
              </button>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate('/batches')} className="bg-[#5A4BDA] text-white px-10 py-3 rounded-xl font-bold text-base hover:bg-[#4B3EBF] active:scale-95 transition-all">
              View More
            </button>
          </div>
        </div>
      </section>

      {/* ══ STATS GRID ═══════════════════════════════════════ */}
      <section className="bg-[#F5F5F5] px-4 py-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="rounded-2xl p-6 flex flex-col items-start" style={{ background: s.bg }}>
                <span className="text-3xl sm:text-4xl font-black text-[#1F2937] mb-1">{s.num}</span>
                <span className="text-sm font-semibold" style={{ color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={openLogin} className="bg-[#5A4BDA] text-white px-10 py-3 rounded-xl font-bold text-base hover:bg-[#4B3EBF] active:scale-95 transition-all">
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* ══ ACADEMIC EXCELLENCE / RESULTS ════════════════════ */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[26px] sm:text-[32px] font-black text-center mb-1">Academic Excellence : Results</h2>
          <p className="text-[#6B7280] text-sm text-center font-medium mb-7">Giving wings to a millions dreams, a million more to go</p>
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
            {RESULT_TABS.map((t, i) => (
              <button
                key={i}
                onClick={() => setResultTab(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${resultTab === i ? 'bg-[#1F2937] text-white border-[#1F2937]' : 'border-gray-200 text-[#4B5563] hover:border-gray-400'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Result banner */}
          <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between min-h-[160px] px-8 py-6 shadow-xl">
            <div>
              <p className="text-yellow-300 font-bold text-sm mb-1">{RESULT_TABS[resultTab].toUpperCase()} 2024 RESULT</p>
              <h3 className="text-white text-2xl sm:text-3xl font-black mb-1">Congratulations!</h3>
              <p className="text-white/60 text-sm font-medium">Outstanding Performance, Incredible Success!</p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
                <p className="text-white text-3xl font-black">AIR 1</p>
                <p className="text-white/60 text-xs mt-1">All India Rank</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ VIDYAPEETH OFFLINE CENTRES ═══════════════════════ */}
      <section className="bg-[#F5F5F5] py-0">
        {/* Blue header banner */}
        <div className="relative bg-[#5A4BDA] py-12 px-4 text-center">
          <div className="absolute top-4 right-6 bg-white/10 px-3 py-1 rounded text-white/60 text-xs font-bold tracking-widest">VIDYAPEETH</div>
          <h2 className="text-white text-xl sm:text-3xl font-black mb-2">Explore Tech-Enabled Offline Vidyapeeth Centres</h2>
          <p className="text-white/20 text-sm font-medium">Creating new benchmarks in learning experiences</p>
        </div>
        <div className="bg-white rounded-t-3xl -mt-4 mx-4 px-6 py-8 shadow-xl max-w-[1200px] mx-auto">
          <h3 className="text-lg font-black text-center mb-1">Find Vidyapeeth Centre in your city</h3>
          <p className="text-center text-sm text-[#6B7280] mb-6">
            Available in <span className="text-[#5A4BDA] font-bold">105 cities</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CITIES.map(c => (
              <button key={c.name} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 hover:border-[#5A4BDA]/30 hover:shadow-md transition-all text-left group">
                <img src={c.img} alt={c.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <span className="font-bold text-sm text-[#1F2937] group-hover:text-[#5A4BDA] transition-colors">{c.name}</span>
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <button className="bg-[#5A4BDA] text-white px-10 py-3 rounded-xl font-bold text-sm hover:bg-[#4B3EBF] active:scale-95 transition-all">
              View All Centres
            </button>
          </div>
        </div>
      </section>

      {/* ══ STUDENTS ❤️ PW (Testimonials) ════════════════════ */}
      <section className="bg-white py-14 px-4">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[26px] sm:text-[32px] font-black text-center mb-1">Students ❤️ Physics Wallah</h2>
          <p className="text-[#5A4BDA] text-sm font-semibold text-center mb-8">Hear from our students</p>
          <div className="border border-gray-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
            {/* Video thumbnail placeholder */}
            <div className="flex-shrink-0 w-full sm:w-[220px] h-[140px] sm:h-[180px] bg-[#1F2937] rounded-xl overflow-hidden relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
                <div className="bg-white/20 rounded-full p-4">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
                </div>
              </div>
              <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">NEET AIR 1</div>
            </div>
            <div className="flex-1">
              <div className="text-3xl text-[#5A4BDA] font-black mb-3">"</div>
              <p className="text-[#374151] text-sm font-medium leading-relaxed mb-4">
                My name is Tathagat Awatar. I secured <span className="text-[#5A4BDA] font-bold">All India Rank 1</span> by scoring full score in NEET UG 2024.
                I started my preparation with Physics Wallah in 12th grade by joining the Lakshya NEET batch, then I took 2 drop by joining Yakeen NEET batch
                and I completed my full preparation from online PW batch. PW teachers and their guidance helps me to acheive AIR1 and motivated me during my drop year....
              </p>
              <p className="font-black text-[#1F2937] text-sm">Multiple Rankers</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ YOUTUBE / APP SECTION ════════════════════════════ */}
      <section className="bg-[#F5F5F5] py-12 px-4">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[20px] sm:text-[28px] font-black text-center mb-2">Join The PW Family, Today!</h2>
          <p className="text-[#6B7280] text-sm text-center mb-8">Access free lectures, notes, and more on YouTube &amp; App</p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a href="https://play.google.com/store/apps/details?id=xyz.penpencil.physicswallah" target="_blank" rel="noreferrer">
              <img src={IMG.googlePlay} alt="Get it on Google Play" className="h-12 object-contain hover:scale-105 transition-transform" />
            </a>
            <a href="https://apps.apple.com/in/app/physics-wallah/id1576709011" target="_blank" rel="noreferrer">
              <img src={IMG.appStore} alt="Download on App Store" className="h-12 object-contain hover:scale-105 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-gray-100 pt-10 pb-6 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 pb-8 border-b border-gray-100">
            {/* Col 1 — Brand */}
            <div>
              <img src={IMG.logo} alt="Physics Wallah" className="h-10 mb-3" />
              <p className="text-xs text-[#6B7280] font-medium leading-relaxed mb-4">
                We understand that every student has unique needs and abilities, that's why our curriculum is designed to adapt to your needs and help you grow!
              </p>
              <div className="flex gap-3 mb-4">
                <a href="https://play.google.com/store/apps/details?id=xyz.penpencil.physicswallah" target="_blank" rel="noreferrer">
                  <img src={IMG.googlePlay} alt="Google Play" className="h-9 object-contain" />
                </a>
                <a href="https://apps.apple.com/in/app/physics-wallah/id1576709011" target="_blank" rel="noreferrer">
                  <img src={IMG.appStore} alt="App Store" className="h-9 object-contain" />
                </a>
              </div>
              <p className="text-xs font-bold text-[#4B5563] mb-2">Let's get social :</p>
              <div className="flex gap-2.5">
                {[
                  { bg: '#1877F2', label: 'f' },
                  { bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', label: '◎' },
                  { bg: '#FF0000', label: '▶' },
                  { bg: '#0A66C2', label: 'in' },
                  { bg: '#1DA1F2', label: '🐦' },
                  { bg: '#229ED9', label: '✈' },
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
              {['About Us', 'Contact Us', 'Careers', 'Press', 'Investors'].map(l => (
                <a key={l} href="#" className="block text-xs text-[#6B7280] hover:text-[#5A4BDA] font-medium mb-2.5 transition-colors">{l}</a>
              ))}
            </div>

            {/* Col 3 */}
            <div>
              <h4 className="font-black text-sm mb-4 text-[#1F2937]">Our Centres</h4>
              {['New Delhi', 'Patna', 'Kota', 'Lucknow', 'Jaipur', 'Kolkata'].map(l => (
                <a key={l} href="#" className="block text-xs text-[#6B7280] hover:text-[#5A4BDA] font-medium mb-2.5 transition-colors">{l}</a>
              ))}
            </div>

            {/* Col 4 */}
            <div>
              <h4 className="font-black text-sm mb-4 text-[#1F2937]">Popular Exams</h4>
              {['IIT JEE', 'NEET', 'GATE', 'UPSC', 'SSC', 'CA'].map(l => (
                <a key={l} href="#" className="block text-xs text-[#5A4BDA] hover:underline font-medium mb-2.5 transition-colors">{l}</a>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-[#9CA3AF] mt-6">Copyright © 2025 Physicswallah Limited. All rights reserved.</p>
        </div>
      </footer>

      {/* ══ FLOATING CALL ════════════════════════════════════ */}
      <a href="tel:+919999999999" className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#5A4BDA] rounded-full flex items-center justify-center shadow-2xl hover:bg-[#4B3EBF] hover:scale-110 active:scale-95 transition-all">
        <img src={IMG.callIcon} alt="Call" className="w-7 h-7 object-contain" />
      </a>

      {/* ══ LOGIN MODAL OVERLAY ═══════════════════════════════ */}
      {loginOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeLogin} />
          <div className="relative bg-white w-full max-w-[460px] rounded-[28px] shadow-2xl overflow-hidden">
            <button onClick={closeLogin} className="absolute top-5 right-5 z-10 hover:opacity-70 transition-opacity">
              <img src={IMG.closeIcon} alt="Close" className="w-7 h-7 object-contain" />
            </button>
            <div className="px-10 pt-10 pb-8 flex flex-col items-center text-center">
              {step === 'phone' ? (
                <>
                  <img src={IMG.otpBadge} alt="PW" className="w-28 h-28 object-contain mb-5" />
                  <h2 className="text-[18px] font-black text-[#1F2937] mb-1.5 leading-snug">Please enter your Mobile Number</h2>
                  <p className="text-[11px] font-bold text-[#D97706] bg-[#FEF3C7] px-4 py-1 rounded-full mb-7 tracking-widest uppercase">New User Registration</p>
                  <div className={`w-full flex items-center border-2 rounded-2xl px-4 py-3.5 mb-4 bg-gray-50 transition-all ${error ? 'border-red-400' : 'border-[#E5E7EB] focus-within:border-[#5A4BDA]'}`}>
                    <div className="flex items-center gap-1.5 pr-3 border-r-2 border-gray-200 mr-3 flex-shrink-0">
                      <span className="text-sm font-bold text-[#374151] whitespace-nowrap">IN +91</span>
                      <ChevronDown size={12} className="text-gray-400" />
                    </div>
                    <input type="tel" inputMode="numeric" value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g,'').slice(0,10)); setError(''); }}
                      placeholder="E.g 9877654335" autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      className="flex-1 bg-transparent outline-none text-base font-bold text-[#1F2937] placeholder:text-gray-300 placeholder:font-normal"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm font-semibold text-left w-full mb-3 pl-1">{error}</p>}
                  <button onClick={handleSendOtp} disabled={loading || phone.length !== 10}
                    className={`w-full py-4 rounded-2xl font-black text-base mb-4 transition-all ${phone.length===10&&!loading ? 'bg-[#5A4BDA] text-white hover:bg-[#4B3EBF] shadow-lg shadow-[#5A4BDA]/20 active:scale-[0.98]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                    {loading ? 'Sending OTP…' : 'Get OTP'}
                  </button>
                  <button onClick={skipLogin} className="text-[#5A4BDA] font-bold text-sm hover:underline">Skip for now →</button>
                </>
              ) : (
                <>
                  <img src={IMG.otpSvg} alt="OTP" className="w-24 h-24 object-contain mb-4" />
                  <h2 className="text-lg font-black text-[#1F2937] mb-1">Enter OTP</h2>
                  <p className="text-[#6B7280] text-sm mb-0.5">6 digit code sent to <span className="font-black text-[#5A4BDA]">{phone}</span></p>
                  <button onClick={() => { setStep('phone'); setDigits(['','','','','','']); setError(''); }} className="text-[#5A4BDA] text-xs font-bold hover:underline mb-6">✎ Change Number</button>
                  <div className="flex gap-2.5 justify-center mb-3">
                    {digits.map((d, i) => (
                      <input key={i} id={`d${i}`} type="text" inputMode="numeric" maxLength={6} value={d}
                        onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleBksp(i, e)} autoFocus={i===0}
                        className={`w-11 h-13 text-center text-xl font-black rounded-xl border-2 outline-none transition-all ${error ? 'border-red-400 bg-red-50 text-red-600' : d ? 'border-[#5A4BDA] bg-[#5A4BDA]/5 text-[#5A4BDA]' : 'border-gray-200 focus:border-[#5A4BDA] bg-gray-50'}`}
                        style={{ height: '52px' }}
                      />
                    ))}
                  </div>
                  {error && <p className="text-red-500 text-sm font-semibold mb-3">{error}</p>}
                  <p className="text-sm text-[#6B7280] mb-5">
                    Didn't receive OTP?{' '}
                    {resend > 0
                      ? <span className="font-black text-[#5A4BDA]">Resend OTP in {resend}s</span>
                      : <button onClick={handleResend} className="text-[#5A4BDA] font-bold hover:underline">Resend OTP</button>
                    }
                  </p>
                  <button onClick={handleVerifyOtp} disabled={loading || otp.length!==6}
                    className={`w-full py-4 rounded-2xl font-black text-base mb-3 transition-all ${otp.length===6&&!loading ? 'bg-[#5A4BDA] text-white hover:bg-[#4B3EBF] active:scale-[0.98]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                    {loading ? 'Verifying…' : 'Verify & Proceed'}
                  </button>
                  <div className="w-full pt-3 border-t border-gray-100">
                    <p className="text-xs text-[#9CA3AF] mb-2.5">Or Try getting OTP via</p>
                    <div className="flex justify-center gap-8">
                      <button className="flex items-center gap-2 text-sm font-bold text-[#374151] hover:text-[#25D366] transition-colors">💬 WhatsApp</button>
                      <button className="flex items-center gap-2 text-sm font-bold text-[#374151] hover:text-[#5A4BDA] transition-colors">📞 Call</button>
                    </div>
                  </div>
                  <button onClick={skipLogin} className="mt-4 text-[#5A4BDA] font-bold text-sm hover:underline">Skip for now →</button>
                </>
              )}
              <p className="mt-5 text-[11px] text-[#9CA3AF] font-medium">
                By continuing you agree to our{' '}
                <a href="#" className="text-[#5A4BDA] font-bold hover:underline">Terms of use</a>{' '}
                &amp; <a href="#" className="text-[#5A4BDA] font-bold hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
