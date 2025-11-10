import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Moon, Sun, TrendingUp, Users, BarChart3, LineChart, MessageSquare, BookOpen, CheckCircle, Circle, Lock } from 'lucide-react';
import { useLocation } from 'wouter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TypingMarkdown from '@/components/TypingMarkdown';

interface Message {
  id: number;
  type: 'bot' | 'user';
  text: string;
  animated?: boolean;
}

interface LoginData {
  name: string;
  phone: string;
  otp: string;
}

interface TrainingSection {
  _id: string | any;
  s_no: number;
  heading: string;
  content: string;
}

interface TrainingProgress {
  phone: string;
  completedSections: number[];
  currentSection: number;
  sectionChats: {
    [key: number]: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string | Date }>;
  };
}

function normalizePhoneE164(input: string, countryCode?: string): string {
  try {
    let p = (input || '').toString().trim();
    p = p.replace(/[\s\-()]/g, '');
    if (p.startsWith('+')) return '+' + p.replace(/[^\d]/g, '').replace(/^\+/, '');
    if (p.startsWith('00')) return '+' + p.slice(2).replace(/\D/g, '');
    const digits = p.replace(/\D/g, '');
    const cc = (countryCode ?? '+1').replace(/\D/g, '');
    return digits ? `+${cc}${digits}` : '';
  } catch { return input; }
}

export default function Landing() {
  const [isDark, setIsDark] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      type: 'bot', 
      text: 'Hello! I\'m Global Metal Direct\'s AI assistant. I have high emotional intelligence and can help with customer insights, sales analytics, data analysis, and more. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
const [loginData, setLoginData] = useState<LoginData>({ name: '', phone: '', otp: '' });
  const [countryCode, setCountryCode] = useState('+1');
  const [nationalNumber, setNationalNumber] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(() => {
    const authed = localStorage.getItem('auth') === 'true';
    if (authed) return 9999;
    const used = parseInt(localStorage.getItem('usedMessages') || '0');
    return Math.max(0, 4 - used);
  });
  // UI state for smooth welcome->chat transition
  const [hasChatted, setHasChatted] = useState(false);
  // Previous chat (for logged-in users)
  const [previousChat, setPreviousChat] = useState<{ messages: Array<{ role: 'user'|'assistant'; content: string; timestamp?: string }>; customerName?: string } | null>(null);
  
  const [, navigate] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trainingMessagesEndRef = useRef<HTMLDivElement>(null);

  // Training state
  const [activeTab, setActiveTab] = useState<'chat' | 'training'>('chat');
  const [trainingSections, setTrainingSections] = useState<TrainingSection[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [trainingMessages, setTrainingMessages] = useState<Message[]>([]);
  const [isTrainingTyping, setIsTrainingTyping] = useState(false);
  const [hasChatInSection, setHasChatInSection] = useState(false);
  const [authChanged, setAuthChanged] = useState(0); // Trigger for auth state changes

  const suggestions = [
    'Analyze sales trends',
    'Customer segmentation',
    'Generate report',
    'Forecast revenue'
  ];

  const theme = {
    dark: {
      bg: '#0a0e12',
      surfaceBg: '#1e2732',
      sidebarBg: '#141a21',
      textPrimary: '#e8edf2',
      textSecondary: '#8b98a8',
      textTertiary: '#5a6573',
      border: '#2a3441',
      hoverBg: '#252e3a',
      inputBg: '#1a2129',
      accentPrimary: '#6b8599',
      accentHover: '#7a95ab',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      glow: '0 0 20px rgba(107, 133, 153, 0.3)'
    },
    light: {
      bg: '#f4f6f8',
      surfaceBg: '#ffffff',
      sidebarBg: '#fafbfc',
      textPrimary: '#1a2332',
      textSecondary: '#4a5568',
      textTertiary: '#718096',
      border: '#e2e8f0',
      hoverBg: '#f1f5f9',
      inputBg: '#ffffff',
      accentPrimary: '#64748b',
      accentHover: '#475569',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      glow: '0 0 20px rgba(100, 116, 139, 0.3)'
    }
  };

  const currentTheme = isDark ? theme.dark : theme.light;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch previous chat for logged-in user
  useEffect(() => {
    const authed = localStorage.getItem('auth') === 'true';
    if (!authed) {
      setPreviousChat(null);
      return;
    }
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (!u?.phone) return;
      fetch(`/api/chat-history/${encodeURIComponent(u.phone)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.messages) {
            setPreviousChat({ messages: data.messages, customerName: data?.metadata?.customerName });
          }
        })
        .catch(() => {});
    } catch {}
  }, [authChanged]);

  // Fetch training data for logged-in user
  useEffect(() => {
    const authed = localStorage.getItem('auth') === 'true';
    if (!authed) {
      // Clear training data when logged out
      setTrainingSections([]);
      setTrainingProgress(null);
      setSelectedSection(null);
      return;
    }
    let u: any = null;
    try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
    if (!u?.phone) return;

    // Fetch training sections
    fetch('/api/training/sections')
      .then(r => r.json())
      .then(data => { 
        if (data?.success) {
          setTrainingSections(data.sections || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch training sections:', err);
      });

    // Fetch training progress
    fetch(`/api/training/progress/${encodeURIComponent(u.phone)}`)
      .then(r => r.json())
      .then(data => { 
        if (data?.success) {
          setTrainingProgress(data.progress);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch training progress:', err);
      });
  }, [authChanged]);

  // Auto-select first incomplete section when training tab is opened
  useEffect(() => {
    if (activeTab !== 'training' || selectedSection !== null || trainingSections.length === 0) return;
    
    // Find first incomplete section that user can chat with
    const firstIncomplete = trainingSections.find(s => {
      const isCompleted = trainingProgress?.completedSections?.includes(s.s_no);
      return !isCompleted && canChatWithSection(s.s_no);
    });
    
    if (firstIncomplete) {
      handleSectionSelect(firstIncomplete.s_no);
    } else if (trainingSections.length > 0) {
      // If all are complete or none available, select the first one (users can still read it)
      handleSectionSelect(trainingSections[0].s_no);
    }
  }, [activeTab, trainingSections, trainingProgress, selectedSection]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Auto-logout if the stored user object is empty/invalid
  useEffect(() => {
    const check = () => {
      const authed = localStorage.getItem('auth') === 'true';
      if (!authed) return;
      let u: any = null;
      try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch { u = null; }
      const invalid = !u || (typeof u === 'object' && Object.keys(u).length === 0) || (!u.name && !u.phone);
      if (invalid) {
        localStorage.removeItem('auth');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const used = parseInt(localStorage.getItem('usedMessages') || '0');
        setRemainingMessages(Math.max(0, 4 - used));
        setShowUserPopup(false);
        setShowLogin(true);
      }
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    if (remainingMessages <= 0) {
      setShowLogin(true);
      return;
    }

    // mark that the conversation has started for smooth transition
    if (!hasChatted) setHasChatted(true);

    const userMessage = { id: messages.length + 1, type: 'user' as const, text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const isAuthedUser = localStorage.getItem('auth') === 'true';
      const user = isAuthedUser ? JSON.parse(localStorage.getItem('user') || '{}') : undefined;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input, user }),
      });

      const data = await response.json();
      
      setIsTyping(false);
      const botText = response.ok && typeof data.response === 'string' && data.response.trim().length > 0
        ? data.response
        : "I'm sorry, I encountered an error. Please try again later.";
      setMessages(prev => [...prev, {
        id: prev.length + 2,
        type: 'bot',
        text: botText,
        animated: true,
      }]);

      // Update remaining messages count only if not authed
      const authed = localStorage.getItem('auth') === 'true';
      if (!authed) {
        const used = parseInt(localStorage.getItem('usedMessages') || '0') + 1;
        localStorage.setItem('usedMessages', used.toString());
        setRemainingMessages(Math.max(0, 4 - used));
        if (4 - used <= 0) {
          setShowLogin(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === 'training') {
        handleTrainingSend();
      } else {
        handleSend();
      }
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  // Training helpers
  const canChatWithSection = (sectionNo: number): boolean => {
    if (!trainingProgress) return sectionNo === 1;
    return trainingProgress.completedSections.includes(sectionNo) ||
           (trainingProgress.completedSections.length === 0 && sectionNo === 1) ||
           trainingProgress.completedSections.includes(sectionNo - 1);
  };

  const handleSectionSelect = async (sectionNo: number) => {
    setSelectedSection(sectionNo);
    setHasChatInSection(false);
    // Build messages from stored section chats if available
    if (trainingProgress && trainingProgress.sectionChats?.[sectionNo]) {
      const hist = trainingProgress.sectionChats[sectionNo];
      const m = hist.map((h, idx) => ({ id: idx + 1, type: h.role === 'assistant' ? 'bot' : 'user', text: h.content } as Message));
      setTrainingMessages(m);
      setHasChatInSection(hist.length > 0);
    } else {
      setTrainingMessages([]);
    }

    // Update current section on server (best-effort)
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      if (u?.phone) {
        await fetch('/api/training/current-section', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: u.phone, sectionNo }) });
      }
    } catch {}
  };

  const handleTrainingSend = async () => {
    if (!input.trim() || isTrainingTyping || selectedSection == null) return;
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (!u?.phone) return;

    const userMessage = { id: trainingMessages.length + 1, type: 'user' as const, text: input };
    setTrainingMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTrainingTyping(true);

    // Mark section as started (will auto-complete on first chat)
    if (!hasChatInSection) {
      setHasChatInSection(true);
      // Auto-complete the section after first message
      try {
        const r = await fetch('/api/training/complete', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ phone: u.phone, sectionNo: selectedSection }) 
        });
        const d = await r.json();
        if (d?.success) setTrainingProgress(d.progress);
      } catch {}
    }

    try {
      const response = await fetch('/api/training/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: u.phone, sectionNo: selectedSection, message: userMessage.text })
      });
      const data = await response.json();
      setIsTrainingTyping(false);
      const botText = response.ok && data?.success ? data.response : (data?.error || "I'm sorry, I encountered an error.");
      setTrainingMessages(prev => [...prev, { id: prev.length + 2, type: 'bot', text: botText, animated: true }]);
    } catch (e) {
      setIsTrainingTyping(false);
    }
  };


const handleRequestOtp = async () => {
    const computedPhone = normalizePhoneE164(nationalNumber, countryCode);
    if (!computedPhone || !loginData.name || isRequestingOtp) return;
    setLoginError(null);
    setIsRequestingOtp(true);

    try {
      const response = await fetch('/api/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
body: JSON.stringify({
          phone: computedPhone,
          name: loginData.name,
        }),
      });

      if (response.ok) {
        setShowOtpInput(true);
        setOtpRequested(true);
      } else {
        const data = await response.json().catch(() => ({}));
        setLoginError((data && (data.error || data.message)) || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error requesting OTP:', error);
      setLoginError('Failed to send OTP. Please try again.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

// Ensure the lead exists in GMT_Leads after successful login (server upserts)
  const ensureLeadExists = async (name: string, phone: string) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, status: 'new', engagementScore: 0 })
      }).catch(() => {});
    } catch (e) {
      console.warn('ensureLeadExists failed', e);
    }
  };

const handleLogin = async () => {
    const computedPhone = normalizePhoneE164(nationalNumber, countryCode);
    if (!computedPhone || !loginData.name || !loginData.otp) return;

    try {
      setLoginError(null);
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
body: JSON.stringify({ ...loginData, phone: computedPhone }),
      });

      if (response.ok) {
        await response.json().catch(() => ({}));
        // Persist auth and profile locally
        localStorage.setItem('auth', 'true');
localStorage.setItem('user', JSON.stringify({
          name: loginData.name,
          phone: computedPhone
        }));

        // Ensure the user exists in GMT_Leads on successful login
await ensureLeadExists(loginData.name, computedPhone);

        localStorage.removeItem('usedMessages');
        setRemainingMessages(9999);
        setShowLogin(false);
        
        // Trigger training data fetch after successful login
        setAuthChanged(prev => prev + 1);
      } else {
        const data = await response.json().catch(() => ({}));
        setLoginError((data && (data.error || data.message)) || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setLoginError('Failed to verify OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundColor: currentTheme.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif"
    }}>

      {/* Header */}
      <header className="border-b" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surfaceBg }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: currentTheme.textSecondary }} />
              <h2 className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight gradient-text" style={{ color: currentTheme.textPrimary, fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
                Genie
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            {(() => {
              const authed = localStorage.getItem('auth') === 'true';
              let u: any = null;
              try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
              const hasProfile = authed && u && (u.name || u.phone);
              if (hasProfile) {
                return (
                  <>
                    <button onClick={() => setShowUserPopup((v) => !v)} className="rounded-full focus:outline-none">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarFallback className="text-xs sm:text-sm font-semibold">
                          {(u.name?.charAt(0) || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    {showUserPopup && (
                      <div className="absolute right-0 top-10 sm:top-12 w-48 sm:w-56 rounded-lg border shadow-lg p-2.5 sm:p-3 z-50" style={{ backgroundColor: currentTheme.surfaceBg, borderColor: currentTheme.border }}>
                        <div className="text-xs sm:text-sm font-semibold mb-1" style={{ color: currentTheme.textPrimary }}>
                          {u.name || 'User'}
                        </div>
                        {u.phone ? (
                          <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                            {u.phone}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                );
              }
              return (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border hover-elevate"
                  style={{ 
                    color: currentTheme.textPrimary,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)',
                    borderColor: currentTheme.border
                  }}
                >
                  Login
                </button>
              );
            })()}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 sm:p-2 rounded-lg transition-all duration-200"
              style={{ 
                color: currentTheme.textSecondary,
                backgroundColor: currentTheme.hoverBg
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.accentPrimary;
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.hoverBg;
                e.currentTarget.style.color = currentTheme.textSecondary;
              }}>
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row" style={{ minHeight: 0 }}>
        {/* Sidebar - only when logged in */}
        {localStorage.getItem('auth') === 'true' && (
          <div className="w-full lg:w-64 xl:w-72 border-b lg:border-b-0 lg:border-r flex-shrink-0 flex flex-col" style={{ backgroundColor: currentTheme.sidebarBg, borderColor: currentTheme.border, maxHeight: '40vh', height: 'auto', overflow: 'hidden' }} data-sidebar="true">
            {/* Tabs */}
            <div className="p-2 sm:p-3 border-b" style={{ borderColor: currentTheme.border }}>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('chat')} 
                  className="flex-1 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all" 
                  style={{ 
                    backgroundColor: activeTab==='chat'?currentTheme.accentPrimary:'transparent', 
                    color: activeTab==='chat'?'#ffffff':currentTheme.textPrimary, 
                    border: `1px solid ${activeTab==='chat'?currentTheme.accentPrimary:currentTheme.border}` 
                  }}
                >
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" /> <span className="hidden sm:inline">Chat</span><span className="sm:hidden">Chat</span>
                </button>
                <button 
                  onClick={() => setActiveTab('training')} 
                  className="flex-1 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all" 
                  style={{ 
                    backgroundColor: activeTab==='training'?currentTheme.accentPrimary:'transparent', 
                    color: activeTab==='training'?'#ffffff':currentTheme.textPrimary, 
                    border: `1px solid ${activeTab==='training'?currentTheme.accentPrimary:currentTheme.border}` 
                  }}
                >
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" /> <span className="hidden sm:inline">Training</span><span className="sm:hidden">Train</span>
                </button>
              </div>
            </div>
            
            {activeTab === 'training' ? (
              <div className="flex-1 overflow-y-auto p-2 sm:p-3">
                <div className="text-xs font-semibold mb-2 px-2" style={{ color: currentTheme.textTertiary }}>TRAINING SECTIONS</div>
                {trainingSections.length > 0 ? trainingSections.map((s) => {
                  const isCompleted = !!trainingProgress?.completedSections?.includes(s.s_no);
                  const canChat = canChatWithSection(s.s_no);
                  const isActive = selectedSection === s.s_no;
                  return (
                    <button 
                      key={s.s_no} 
                      onClick={() => handleSectionSelect(s.s_no)} 
                      className="w-full text-left px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg flex items-start gap-2 mb-1 transition-all" 
                      style={{ 
                        backgroundColor: isActive?currentTheme.hoverBg:'transparent', 
                        color: currentTheme.textPrimary,
                        cursor: 'pointer',
                        opacity: 1
                      }}
                    >
                      {isCompleted ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" style={{ color: '#10b981' }} /> : canChat ? <Circle className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" /> : <Lock className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" style={{ color: currentTheme.textTertiary }} />}
                      <span className="text-xs sm:text-sm font-medium" style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>{s.s_no}. {s.heading}</span>
                    </button>
                  );
                }) : (
                  <div className="text-xs text-center py-4" style={{ color: currentTheme.textTertiary }}>No training sections available</div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-3 sm:p-4 hidden lg:block">
                <div className="text-xs sm:text-sm" style={{ color: currentTheme.textSecondary }}>Switch to Training tab to view sections</div>
              </div>
            )}
          </div>
        )}

        {/* Main content panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
              {activeTab === 'chat' ? (
                <>
                  {/* Hero (stays mounted and fades out when chat starts) */}
                  <section className={[ 'flex items-center justify-center pt-8 sm:pt-16 md:pt-24 transition-all duration-500', hasChatted ? 'opacity-0 translate-y-[-16px] h-0 py-0 mb-0 overflow-hidden' : 'min-h-[20vh] sm:min-h-[30vh] opacity-100' ].join(' ')}>
                    <div className="w-full text-center px-4">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight gradient-text" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
                        GMD Genie
                      </h1>
                      <p className="mt-2 text-xs sm:text-sm md:text-base" style={{ color: currentTheme.textSecondary }}>
                        Your AI assistant for professional customer conversations and insights.
                      </p>
                      {localStorage.getItem('auth') === 'true' && previousChat?.messages?.length ? (
                        <div className="mt-4 flex items-center justify-center">
                          <button onClick={() => { const baseId = messages.length + 1; const converted = previousChat!.messages.map((m, idx) => ({ id: baseId + idx, type: m.role === 'assistant' ? 'bot' : 'user', text: m.content } as Message)); setMessages(prev => prev.length > 1 ? prev : [prev[0], ...converted]); setHasChatted(true); }} className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border hover-elevate" style={{ color: currentTheme.textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)', borderColor: currentTheme.border }}>Continue previous conversation</button>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  {messages.length > 0 && (
                    <>
                      {messages.map((message) => (
                        <div key={message.id} className="mb-4 sm:mb-6">
                          <div className="flex gap-2 sm:gap-3">
                            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: message.type === 'bot' ? currentTheme.accentPrimary : currentTheme.hoverBg }}>
                              {message.type === 'bot' ? (<Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#ffffff' }} strokeWidth={2.5} />) : (<User className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: currentTheme.textPrimary }} strokeWidth={2.5} />)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs sm:text-sm mb-1" style={{ color: currentTheme.textPrimary }}>
                                {message.type === 'bot' ? 'Global Metal Direct' : 'You'}
                              </div>
                              <div className="text-xs sm:text-sm leading-relaxed" style={{ color: currentTheme.textPrimary }}>
                                {message.type === 'bot' ? (message.animated ? (<TypingMarkdown text={message.text} invert={isDark} speed={24} onDone={() => { setMessages(prev => prev.map(m => m.id === message.id ? { ...m, animated: false } : m)); }} />) : (<MarkdownRenderer text={message.text} invert={isDark} />)) : (<MarkdownRenderer text={message.text} invert={isDark} />)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="mb-4 sm:mb-6">
                          <div className="flex gap-2 sm:gap-3">
                            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentTheme.accentPrimary }}>
                              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#ffffff' }} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs sm:text-sm mb-2" style={{ color: currentTheme.textPrimary }}>
                                Global Metal Direct
                              </div>
                              <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.accentPrimary, animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.accentPrimary, animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.accentPrimary, animationDelay: '300ms' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div ref={messagesEndRef} />
                </>
              ) : (
                // Training tab content
                <>
                  {selectedSection && trainingSections.find(s => s.s_no === selectedSection) ? (
                    <div className="mb-4 sm:mb-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-3">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: currentTheme.textPrimary, lineHeight: '1.3' }}>
                          {trainingSections.find(s => s.s_no === selectedSection)!.heading}
                        </h2>
                        {(trainingProgress?.completedSections || []).includes(selectedSection) && (
                          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>Completed</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 md:p-5 rounded-lg mb-4 training-content-box" style={{ backgroundColor: currentTheme.surfaceBg, border: `1px solid ${currentTheme.border}`, maxHeight: '60vh', overflowY: 'auto' }}>
                        <MarkdownRenderer text={trainingSections.find(s => s.s_no === selectedSection)!.content} invert={isDark} />
                      </div>
                      {!canChatWithSection(selectedSection) ? (
                        <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg flex items-start gap-2 sm:gap-3 mb-4" style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
                          <div className="flex-shrink-0 mt-0.5">
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#ef4444' }} />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                              Section Locked
                            </p>
                            <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                              Complete the previous section to unlock chat for this section. You can read the content above, but chatting is disabled until you progress through the training.
                            </p>
                          </div>
                        </div>
                      ) : !(trainingProgress?.completedSections || []).includes(selectedSection) && (
                        <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg flex items-start gap-2 sm:gap-3 mb-4" style={{ backgroundColor: isDark ? 'rgba(107, 133, 153, 0.1)' : 'rgba(100, 116, 139, 0.1)', border: `1px solid ${currentTheme.border}` }}>
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: currentTheme.accentPrimary }}>
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                              Start chatting to complete this section
                            </p>
                            <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                              Once you send your first message, this section will be marked as complete automatically.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {trainingMessages.map((message) => (
                    <div key={message.id} className="mb-4 sm:mb-6">
                      <div className="flex gap-2 sm:gap-3">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: message.type === 'bot' ? currentTheme.accentPrimary : currentTheme.hoverBg }}>
                          {message.type === 'bot' ? (<Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#ffffff' }} strokeWidth={2.5} />) : (<User className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: currentTheme.textPrimary }} strokeWidth={2.5} />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs sm:text-sm mb-1" style={{ color: currentTheme.textPrimary }}>
                            {message.type === 'bot' ? 'GMD Genie' : 'You'}
                          </div>
                          <div className="text-xs sm:text-sm leading-relaxed" style={{ color: currentTheme.textPrimary }}>
                            {message.type === 'bot' ? (message.animated ? (<TypingMarkdown text={message.text} invert={isDark} speed={24} onDone={() => { setTrainingMessages(prev => prev.map(m => m.id === message.id ? { ...m, animated: false } : m)); }} />) : (<MarkdownRenderer text={message.text} invert={isDark} />)) : (<MarkdownRenderer text={message.text} invert={isDark} />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTrainingTyping && (
                    <div className="mb-4 sm:mb-6">
                      <div className="flex gap-2 sm:gap-3">
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentTheme.accentPrimary }}>
                          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#ffffff' }} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs sm:text-sm mb-2" style={{ color: currentTheme.textPrimary }}>
                            GMD Genie
                          </div>
                          <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.accentPrimary, animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.accentPrimary, animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.accentPrimary, animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={trainingMessagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surfaceBg }}>
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
              {!showLogin ? (
                <>
                  {activeTab === 'chat' && (
                    <div className="mb-2 flex flex-wrap gap-1.5 sm:gap-2">
                      {['What can you do?','Summarize my last chat','Create a follow-up reply'].map((p, i) => (
                        <button key={i} onClick={() => handleSuggestion(p)} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs border hover-elevate transition whitespace-nowrap" style={{ backgroundColor: currentTheme.surfaceBg, color: currentTheme.textSecondary, borderColor: currentTheme.border }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="relative flex items-end gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border transition-all" style={{ backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border }}>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={activeTab === 'training' ? (selectedSection == null ? 'Select a section first' : !canChatWithSection(selectedSection) ? 'Complete previous sections to unlock chat' : 'Ask about this section...') : (remainingMessages > 0 ? 'Message Genie...' : 'Please login to continue chatting')}
                      disabled={activeTab === 'training' ? (selectedSection == null || !canChatWithSection(selectedSection)) : remainingMessages <= 0}
                      rows={1}
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent resize-none focus:outline-none text-xs sm:text-sm"
                      style={{ color: currentTheme.textPrimary, maxHeight: '120px', lineHeight: '1.5' }}
                    />
                    <button onClick={activeTab === 'training' ? handleTrainingSend : handleSend} disabled={!input.trim() || (activeTab === 'training' ? (selectedSection == null || !canChatWithSection(selectedSection)) : remainingMessages <= 0)} className="m-1.5 sm:m-2 p-2 sm:p-2.5 rounded-lg transition-all flex-shrink-0" style={{ backgroundColor: input.trim() && (activeTab === 'training' ? (selectedSection != null && canChatWithSection(selectedSection)) : remainingMessages > 0) ? currentTheme.accentPrimary : currentTheme.hoverBg, color: input.trim() && (activeTab === 'training' ? (selectedSection != null && canChatWithSection(selectedSection)) : remainingMessages > 0) ? '#ffffff' : currentTheme.textTertiary }}>
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl border" style={{ backgroundColor: currentTheme.inputBg, borderColor: currentTheme.border, boxShadow: currentTheme.shadow }}>
                  <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: currentTheme.textPrimary }}>
                    Continue Chatting
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: currentTheme.textSecondary }}>
                        Name
                      </label>
                      <input type="text" value={loginData.name} onChange={(e) => setLoginData({ ...loginData, name: e.target.value })} className="w-full px-3 sm:px-4 py-2 rounded-lg border focus:outline-none text-sm" style={{ backgroundColor: currentTheme.surfaceBg, borderColor: currentTheme.border, color: currentTheme.textPrimary }} placeholder="Enter your name" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: currentTheme.textSecondary }}>
                        Phone Number
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="px-2 sm:px-3 py-2 rounded-lg border focus:outline-none text-xs sm:text-sm" style={{ backgroundColor: currentTheme.surfaceBg, borderColor: currentTheme.border, color: currentTheme.textPrimary }}>
                          <option value="+1">USA/Canada (+1)</option>
                          <option value="+91">India (+91)</option>
                          <option value="+44">UK (+44)</option>
                          <option value="+61">Australia (+61)</option>
                          <option value="+971">UAE (+971)</option>
                        </select>
                        <input type="tel" inputMode="tel" value={nationalNumber} onChange={(e) => setNationalNumber(e.target.value.replace(/\D/g, ''))} onBlur={() => { if (loginData.name && nationalNumber && !otpRequested) { handleRequestOtp(); } }} className="flex-1 px-3 sm:px-4 py-2 rounded-lg border focus:outline-none text-sm" style={{ backgroundColor: currentTheme.surfaceBg, borderColor: currentTheme.border, color: currentTheme.textPrimary }} placeholder="Enter your number" />
                      </div>
                    </div>
                    {showOtpInput && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1" style={{ color: currentTheme.textSecondary }}>
                          OTP
                        </label>
                        <input type="text" inputMode="numeric" maxLength={6} value={loginData.otp} onChange={(e) => setLoginData({ ...loginData, otp: e.target.value.replace(/\D/g, '') })} className="w-full px-3 sm:px-4 py-2 rounded-lg border focus:outline-none text-sm" style={{ backgroundColor: currentTheme.surfaceBg, borderColor: currentTheme.border, color: currentTheme.textPrimary }} placeholder="Enter 6-digit OTP" />
                        <p className="text-xs mt-2" style={{ color: currentTheme.textSecondary }}>{(() => { const p = normalizePhoneE164(nationalNumber, countryCode); return `OTP sent to ${p || ''}. ${isRequestingOtp ? 'Sending…' : otpRequested ? 'Didn\'t get it? Re-enter phone to resend.' : ''}`; })()}</p>
                      </div>
                    )}
                    {loginError && (<div className="text-xs sm:text-sm bg-red-500/10 border border-red-500/30 text-red-300 px-2.5 sm:px-3 py-2 rounded-lg">{loginError}</div>)}
                    <button onClick={showOtpInput ? handleLogin : handleRequestOtp} disabled={showOtpInput ? !(loginData.otp && loginData.otp.length >= 4) : !(loginData.name && nationalNumber) || isRequestingOtp} className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed" style={{ backgroundColor: currentTheme.accentPrimary, color: '#ffffff', boxShadow: currentTheme.glow }}>
                      {showOtpInput ? 'Verify & Continue' : (isRequestingOtp ? 'Sending OTP…' : 'Request OTP')}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-center mt-2" style={{ color: currentTheme.textTertiary }}>
                {showLogin ? "Login to continue the conversation and access all features." : "Genie can make mistakes. Consider checking important information."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        ::placeholder {
          color: ${currentTheme.textTertiary};
          opacity: 1;
        }
        
        textarea::-webkit-scrollbar {
          width: 4px;
        }
        
        textarea::-webkit-scrollbar-track {
          background: transparent;
        }
        
        textarea::-webkit-scrollbar-thumb {
          background: ${currentTheme.border};
          border-radius: 2px;
        }
        
        div::-webkit-scrollbar {
          width: 6px;
        }
        
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        
        div::-webkit-scrollbar-thumb {
          background: ${currentTheme.accentPrimary};
          border-radius: 3px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: ${currentTheme.accentHover};
        }
      `}</style>
    </div>
  );
}