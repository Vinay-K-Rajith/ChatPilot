import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Moon, Sun, TrendingUp, Users, BarChart3, LineChart, MessageSquare } from 'lucide-react';
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
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(() => {
    const authed = localStorage.getItem('auth') === 'true';
    if (authed) return 9999;
    const used = parseInt(localStorage.getItem('usedMessages') || '0');
    return Math.max(0, 10 - used);
  });
  // UI state for smooth welcome->chat transition
  const [hasChatted, setHasChatted] = useState(false);
  // Previous chat (for logged-in users)
  const [previousChat, setPreviousChat] = useState<{ messages: Array<{ role: 'user'|'assistant'; content: string; timestamp?: string }>; customerName?: string } | null>(null);
  
  const [, navigate] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!authed) return;
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
  }, []);

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
        setRemainingMessages(Math.max(0, 10 - used));
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
        setRemainingMessages(Math.max(0, 10 - used));
        if (10 - used <= 0) {
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
      handleSend();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  const handleRequestOtp = async () => {
    if (!loginData.phone || !loginData.name || isRequestingOtp) return;
    setLoginError(null);
    setIsRequestingOtp(true);

    try {
      const response = await fetch('/api/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginData.phone,
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

  // Ensure the lead exists in GMT_Leads after successful login
  const ensureLeadExists = async (name: string, phone: string) => {
    try {
      const qs = new URLSearchParams({ limit: '1', search: phone });
      const r = await fetch(`/api/leads?${qs.toString()}`);
      if (r.ok) {
        const data = await r.json();
        const exists = Array.isArray(data?.leads) && data.leads.some((l: any) => (l?.phone || '').trim() === phone.trim());
        if (!exists) {
          await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, status: 'new', engagementScore: 0 })
          }).catch(() => {});
        }
      } else {
        // If check fails, attempt creation optimistically (handles unique index)
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, status: 'new', engagementScore: 0 })
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('ensureLeadExists failed', e);
    }
  };

  const handleLogin = async () => {
    if (!loginData.phone || !loginData.name || !loginData.otp) return;

    try {
      setLoginError(null);
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        await response.json().catch(() => ({}));
        // Persist auth and profile locally
        localStorage.setItem('auth', 'true');
        localStorage.setItem('user', JSON.stringify({
          name: loginData.name,
          phone: loginData.phone
        }));

        // Ensure the user exists in GMT_Leads on successful login
        await ensureLeadExists(loginData.name, loginData.phone);

        localStorage.removeItem('usedMessages');
        setRemainingMessages(9999);
        setShowLogin(false);
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
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ 
      backgroundColor: currentTheme.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif"
    }}>
      {/* Animated background + orbs */}
      <div className="absolute inset-0 -z-10 gradient-animated opacity-30" />
      <div className="absolute inset-0 -z-10 radial-bg" />
      <div className="absolute -z-10 orb orb-1 -top-10 -left-10" />
      <div className="absolute -z-10 orb orb-2 top-1/3 -right-10" />
      <div className="absolute -z-10 orb orb-3 -bottom-10 left-1/4" />

      {/* Sticky Nav */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-glass" style={{ borderColor: currentTheme.border }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" style={{ color: currentTheme.textSecondary }} />
              <h2 className="text-base md:text-lg font-extrabold tracking-tight gradient-text" style={{ color: currentTheme.textPrimary, fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
                ChatPilot
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            {(() => {
              const authed = localStorage.getItem('auth') === 'true';
              let u: any = null;
              try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
              const hasProfile = authed && u && (u.name || u.phone);
              if (hasProfile) {
                return (
                  <>
                    <button onClick={() => setShowUserPopup((v) => !v)} className="rounded-full focus:outline-none">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm font-semibold">
                          {(u.name?.charAt(0) || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    {showUserPopup && (
                      <div className="absolute right-0 top-12 w-56 rounded-lg border shadow-lg p-3" style={{ backgroundColor: currentTheme.surfaceBg, borderColor: currentTheme.border }}>
                        <div className="text-sm font-semibold mb-1" style={{ color: currentTheme.textPrimary }}>
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
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all border hover-elevate"
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
              className="p-2 rounded-lg transition-all duration-200"
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
              {isDark ? <Sun className="w-5 h-5" strokeWidth={2.5} /> : <Moon className="w-5 h-5" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col">
      {/* Messages Area + Hero */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1280px] mx-auto px-4 py-8">
            {/* Hero (stays mounted and fades out when chat starts) */}
            <section
              className={[
                'flex items-center justify-center pt-24 md:pt-32 transition-all duration-500',
                hasChatted ? 'opacity-0 translate-y-[-16px] h-0 py-0 mb-0 overflow-hidden' : 'min-h-[40vh] opacity-100'
              ].join(' ')}
            >
              <div className="w-full max-w-4xl text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight gradient-text" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
                  Welcome to GMT's ChatPilot
                </h1>
                <p className="mt-2 md:mt-3 text-sm md:text-lg" style={{ color: currentTheme.textSecondary }}>
                  Your AI assistant for professional customer conversations and insights.
                </p>

                {/* Previous chat access for logged-in users */}
                {localStorage.getItem('auth') === 'true' && previousChat?.messages?.length ? (
                  <div className="mt-6 flex items-center justify-center">
                    <button
                      onClick={() => {
                        const baseId = messages.length + 1;
                        const converted = previousChat!.messages.map((m, idx) => ({
                          id: baseId + idx,
                          type: m.role === 'assistant' ? 'bot' : 'user',
                          text: m.content
                        } as Message));
                        setMessages(prev => prev.length > 1 ? prev : [prev[0], ...converted]);
                        setHasChatted(true);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all border hover-elevate"
                      style={{ color: currentTheme.textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)', borderColor: currentTheme.border }}
                    >
                      Continue previous conversation
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Messages list */}
            {messages.length > 0 && (
              <>
                {messages.map((message) => (
                  <div key={message.id} className="mb-5">
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ 
                          backgroundColor: message.type === 'bot' ? currentTheme.accentPrimary : currentTheme.hoverBg,
                          boxShadow: message.type === 'bot' ? currentTheme.glow : 'none'
                        }}>
                        {message.type === 'bot' ? (
                          <Bot className="w-5 h-5" style={{ color: '#ffffff' }} strokeWidth={2.5} />
                        ) : (
                          <User className="w-4 h-4" style={{ color: currentTheme.textPrimary }} strokeWidth={2.5} />
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="flex-1 space-y-2">
                        <div className="font-bold text-sm" style={{ color: currentTheme.textPrimary }}>
                          {message.type === 'bot' ? 'Global Metal Direct' : 'You'}
                        </div>
                        <div className="text-sm leading-6">
                          {message.type === 'bot' ? (
                            message.animated ? (
                              <TypingMarkdown text={message.text} invert={isDark} speed={24} onDone={() => {
                                setMessages(prev => prev.map(m => m.id === message.id ? { ...m, animated: false } : m));
                              }} />
                            ) : (
                              <MarkdownRenderer text={message.text} invert={isDark} />
                            )
                          ) : (
                            <MarkdownRenderer text={message.text} invert={isDark} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="mb-5">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ 
                          backgroundColor: currentTheme.accentPrimary,
                          boxShadow: currentTheme.glow
                        }}>
                        <Bot className="w-5 h-5" style={{ color: '#ffffff' }} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="font-bold text-sm mb-1" style={{ color: currentTheme.textPrimary }}>
                          Global Metal Direct
                        </div>
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full animate-bounce" 
                            style={{ 
                              backgroundColor: currentTheme.accentPrimary,
                              animationDelay: '0ms'
                            }}></div>
                          <div className="w-2 h-2 rounded-full animate-bounce" 
                            style={{ 
                              backgroundColor: currentTheme.accentPrimary,
                              animationDelay: '150ms'
                            }}></div>
                          <div className="w-2 h-2 rounded-full animate-bounce" 
                            style={{ 
                              backgroundColor: currentTheme.accentPrimary,
                              animationDelay: '300ms'
                            }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t backdrop-blur-glass" style={{ 
          borderColor: currentTheme.border,
          backgroundColor: currentTheme.surfaceBg
        }}>
          <div className="max-w-3xl mx-auto px-4 py-6">
            {!showLogin ? (
              <>
                {/* Quick-start prompts */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {['What can you do?','Summarize my last chat','Create a follow-up reply'].map((p, i) => (
                    <button key={i} onClick={() => handleSuggestion(p)} className="px-3 py-1.5 rounded-lg text-xs border hover-elevate transition" style={{ backgroundColor: currentTheme.surfaceBg, color: currentTheme.textSecondary, borderColor: currentTheme.border }}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="relative flex items-end gap-2 rounded-3xl border transition-all duration-200" 
                style={{ 
                  backgroundColor: currentTheme.inputBg,
                  borderColor: currentTheme.border,
                  boxShadow: currentTheme.shadow
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accentPrimary;
                  e.currentTarget.style.boxShadow = currentTheme.glow;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.border;
                  e.currentTarget.style.boxShadow = currentTheme.shadow;
                }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={remainingMessages > 0 ? "Message ChatPilot..." : "Please login to continue chatting"}
                  disabled={remainingMessages <= 0}
                  rows={1}
                  className="flex-1 px-4 py-4 md:py-5 bg-transparent resize-none focus:outline-none text-sm"
                  style={{ 
                    color: currentTheme.textPrimary,
                    maxHeight: '200px',
                    lineHeight: '1.6'
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || remainingMessages <= 0}
                  className="m-2.5 p-3 rounded-xl transition-all duration-200 flex-shrink-0"
                  style={{
                    backgroundColor: input.trim() && remainingMessages > 0 ? currentTheme.accentPrimary : currentTheme.hoverBg,
                    color: input.trim() && remainingMessages > 0 ? '#ffffff' : currentTheme.textTertiary,
                    cursor: input.trim() && remainingMessages > 0 ? 'pointer' : 'not-allowed',
                    opacity: input.trim() && remainingMessages > 0 ? 1 : 0.5,
                    boxShadow: input.trim() && remainingMessages > 0 ? currentTheme.glow : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (input.trim() && remainingMessages > 0) {
                      e.currentTarget.style.backgroundColor = currentTheme.accentHover;
                      e.currentTarget.style.transform = 'scale(1.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (input.trim() && remainingMessages > 0) {
                      e.currentTarget.style.backgroundColor = currentTheme.accentPrimary;
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}>
                  <Send className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              </>
            ) : (
              <div className="p-6 rounded-2xl border" style={{
                backgroundColor: currentTheme.inputBg,
                borderColor: currentTheme.border,
                boxShadow: currentTheme.shadow
              }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: currentTheme.textPrimary }}>
                  Continue Chatting
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.textSecondary }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={loginData.name}
                      onChange={(e) => setLoginData({ ...loginData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                      style={{
                        backgroundColor: currentTheme.surfaceBg,
                        borderColor: currentTheme.border,
                        color: currentTheme.textPrimary
                      }}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.textSecondary }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={loginData.phone}
                      onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                      onBlur={() => {
                        if (loginData.name && loginData.phone && !otpRequested) {
                          handleRequestOtp();
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                      style={{
                        backgroundColor: currentTheme.surfaceBg,
                        borderColor: currentTheme.border,
                        color: currentTheme.textPrimary
                      }}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  {showOtpInput && (
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.textSecondary }}>
                        OTP
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={loginData.otp}
                        onChange={(e) => setLoginData({ ...loginData, otp: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                        style={{
                          backgroundColor: currentTheme.surfaceBg,
                          borderColor: currentTheme.border,
                          color: currentTheme.textPrimary
                        }}
                        placeholder="Enter 6-digit OTP"
                      />
                      <p className="text-xs mt-2" style={{ color: currentTheme.textSecondary }}>
                        OTP sent to {loginData.phone}. {isRequestingOtp ? 'Sending…' : otpRequested ? 'Didn\'t get it? Re-enter phone to resend.' : ''}
                      </p>
                    </div>
                  )}
                  {loginError && (
                    <div className="text-sm bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg">
                      {loginError}
                    </div>
                  )}
                  <button
                    onClick={showOtpInput ? handleLogin : handleRequestOtp}
                    disabled={showOtpInput ? !(loginData.otp && loginData.otp.length >= 4) : !(loginData.name && loginData.phone) || isRequestingOtp}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: currentTheme.accentPrimary,
                      color: '#ffffff',
                      boxShadow: currentTheme.glow
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.accentPrimary;
                    }}>
                    {showOtpInput ? 'Verify & Continue' : (isRequestingOtp ? 'Sending OTP…' : 'Request OTP')}
                  </button>
                </div>
              </div>
            )}
            <p className="text-sm text-center mt-3 font-medium" style={{ color: currentTheme.textTertiary }}>
              {showLogin ? 
                "Login to continue the conversation and access all features." :
                "ChatPilot can make mistakes. Consider checking important information."}
            </p>
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