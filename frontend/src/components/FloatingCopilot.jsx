import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, X, Send, Minimize2, Maximize2, Trash2, ArrowRight } from 'lucide-react';
import api from '../api/axiosInstance';

export default function FloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: "👋 Hi there! I'm your StockSense AI Warehouse Partner, powered by Google Gemini.\n\nI have live, real-time access to your warehouse database — including on-hand stock counts, rack locations, reorder thresholds, and shipments. How can I help you optimize operations today?",
      suggestions: [
        'Which products are low on stock?',
        'Where is automatic washing machine stored?',
        'Give me today’s warehouse priority actions',
        'What is our total inventory valuation?',
      ],
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, conversation]);

  const handleSend = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = { role: 'user', text: q };
    setConversation((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      // Pass conversation history so Gemini reasons with multi-turn context
      const historyPayload = conversation.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await api.post('/intelligence/copilot', {
        query: q,
        history: historyPayload,
      });

      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.data.answer,
          dataTable: res.data.dataTable,
          suggestions: res.data.suggestions,
        },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "I encountered a temporary communication glitch with the warehouse engine. Please try asking again!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setConversation([
      {
        role: 'assistant',
        text: "Conversation cleared. How can I assist you with your warehouse operations now?",
        suggestions: [
          'Which products are low on stock?',
          'What is our total stock valuation?',
          'Where are my materials stored?',
        ],
      },
    ]);
  };

  // Helper to format basic markdown-style text (bolding, bullet points, headers)
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} style={{ fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 4px', color: '#1E293B' }}>
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} style={{ fontSize: '1rem', fontWeight: 700, margin: '10px 0 4px', color: '#0F172A' }}>
            {trimmed.replace('## ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemContent = trimmed.slice(2);
        return (
          <div key={idx} style={{ display: 'flex', gap: '6px', margin: '3px 0', paddingLeft: '4px' }}>
            <span style={{ color: '#4F46E5', fontWeight: 700 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(itemContent) }} />
          </div>
        );
      }
      if (trimmed.startsWith('---')) {
        return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '8px 0' }} />;
      }
      if (!trimmed) {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      return (
        <p key={idx} style={{ margin: '3px 0' }} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    });
  };

  const formatInline = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;padding:1px 4px;border-radius:4px;font-size:0.85em;color:#0F172A;">$1</code>');
  };

  return (
    <>
      {/* Floating Pill Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9990,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '9999px',
            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.88rem',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(79, 70, 229, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.4)';
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#4ADE80',
              boxShadow: '0 0 8px #4ADE80',
            }}
          />
          <Sparkles size={16} />
          <span>Ask AI Copilot</span>
        </button>
      )}

      {/* Floating Copilot Modal/Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: isMinimized ? '340px' : '440px',
            maxWidth: 'calc(100vw - 32px)',
            height: isMinimized ? '56px' : '620px',
            maxHeight: 'calc(100vh - 48px)',
            background: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            zIndex: 9995,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.2s ease, width 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#A5B4FC',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>StockSense AI Partner</span>
                  <span
                    style={{
                      background: '#10B981',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      display: 'inline-block',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#C7D2FE' }}>
                  Gemini Brain • Live Warehouse Context
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {!isMinimized && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  title="Clear chat"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#A5B4FC',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                title={isMinimized ? 'Expand' : 'Minimize'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A5B4FC',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A5B4FC',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Main Body (Hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div
                style={{
                  flex: 1,
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  background: '#F8FAFC',
                }}
              >
                {conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '88%',
                        padding: '12px 14px',
                        borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        background: msg.role === 'user' ? '#4F46E5' : '#FFFFFF',
                        color: msg.role === 'user' ? '#FFFFFF' : '#1E293B',
                        fontSize: '0.84rem',
                        lineHeight: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',
                      }}
                    >
                      {msg.role === 'user' ? msg.text : renderFormattedText(msg.text)}

                      {/* Render data table if included */}
                      {msg.dataTable && (
                        <div style={{ marginTop: '10px', overflowX: 'auto' }}>
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '0.76rem',
                              background: '#F8FAFC',
                              borderRadius: '6px',
                              overflow: 'hidden',
                            }}
                          >
                            <thead>
                              <tr style={{ background: '#EEF2FF', color: '#4338CA' }}>
                                {msg.dataTable.columns.map((c, cIdx) => (
                                  <th key={cIdx} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.dataTable.rows.map((r, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                  {r.map((cell, cellIdx) => (
                                    <td key={cellIdx} style={{ padding: '5px 8px' }}>
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Suggestions Chips from Assistant */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginTop: '8px',
                          maxWidth: '95%',
                        }}
                      >
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSend(sug)}
                            style={{
                              fontSize: '0.74rem',
                              padding: '4px 10px',
                              background: '#FFFFFF',
                              border: '1px solid #C7D2FE',
                              color: '#4338CA',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#EEF2FF';
                              e.currentTarget.style.borderColor = '#818CF8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#C7D2FE';
                            }}
                          >
                            <span>{sug}</span>
                            <ArrowRight size={10} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '0.8rem', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span className="dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366F1' }} />
                      <span className="dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6' }} />
                      <span className="dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EC4899' }} />
                    </div>
                    <span>AI Brain is analyzing live warehouse context...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div
                style={{
                  padding: '12px 14px',
                  background: '#FFFFFF',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask anything about stock, locations, or strategy..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
                    onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                  />
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    style={{
                      padding: '10px 14px',
                      background: query.trim() ? '#4F46E5' : '#E2E8F0',
                      color: query.trim() ? '#FFFFFF' : '#94A3B8',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: query.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Send size={15} />
                  </button>
                </form>
                <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '0.68rem', color: '#94A3B8' }}>
                  Powered by Google Gemini 2.5 / Flash AI Brain • Real-time DB Sync
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
