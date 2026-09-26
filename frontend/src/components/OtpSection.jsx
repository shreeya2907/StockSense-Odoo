import React, { useEffect, useRef } from 'react';
import { ShieldCheck, RotateCw, Copy, Check, Zap, AlertCircle } from 'lucide-react';

export default function OtpSection({
  otp,
  setOtp,
  onSendOtp,
  sending,
  dispatchedOtp,
  resendCooldown,
  title = 'Real-Time 6-Digit OTP Verification',
  subtitle = 'A 6-digit OTP code is required for real-time authentication.',
  error = null,
  isMandatory = true,
  emailValue = '',
}) {
  const inputRefs = useRef([]);

  const handleDigitChange = (val, idx) => {
    // If user pastes full 6 digits
    const cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6);
      setOtp(pasted);
      const targetFocus = Math.min(pasted.length, 5);
      inputRefs.current[targetFocus]?.focus();
      return;
    }

    const digit = cleaned.slice(-1);
    const currentArr = (otp || '').padEnd(6, ' ').split('');
    currentArr[idx] = digit || ' ';
    const updated = currentArr.join('').trimEnd();
    setOtp(updated);

    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (!otp[idx] && idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleAutoFill = () => {
    if (dispatchedOtp) {
      setOtp(dispatchedOtp);
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1.5px solid #E2E8F0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              background: '#EEF2FF',
              color: '#4F46E5',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
              {title} {isMandatory && <span style={{ color: '#DC2626' }}>*</span>}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* Send / Resend OTP Action Button */}
        <button
          type="button"
          onClick={onSendOtp}
          disabled={sending || resendCooldown > 0}
          className="btn btn-secondary btn-sm"
          style={{
            fontSize: '0.76rem',
            padding: '5px 10px',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            background: resendCooldown > 0 ? '#F1F5F9' : '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: resendCooldown > 0 ? '#94A3B8' : '#4F46E5',
          }}
          title={emailValue ? `Send OTP to ${emailValue}` : 'Send OTP'}
        >
          {sending ? (
            'Sending...'
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            <>
              <RotateCw size={12} style={{ marginRight: '4px' }} />
              {dispatchedOtp ? 'Resend OTP' : 'Send OTP'}
            </>
          )}
        </button>
      </div>

      {/* 6-Digit OTP Boxes */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '14px 0 10px 0' }}>
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const char = otp && otp[index] !== ' ' ? otp[index] : '';
          const isFilled = Boolean(char);
          return (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={char || ''}
              onChange={(e) => handleDigitChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="•"
              style={{
                width: '42px',
                height: '48px',
                textAlign: 'center',
                fontSize: '1.25rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: isFilled ? '2px solid #4F46E5' : '1.5px solid #CBD5E1',
                background: isFilled ? '#FFFFFF' : '#F1F5F9',
                color: '#0F172A',
                outline: 'none',
                transition: 'all 0.15s ease-in-out',
                boxShadow: isFilled ? '0 0 0 2px rgba(79, 70, 229, 0.12)' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Real-Time Dispatched OTP Simulation Banner */}
      {dispatchedOtp ? (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#166534' }}>
            <Zap size={14} color="#16A34A" />
            <span>
              Real-Time Code: <strong style={{ letterSpacing: '2px', fontSize: '0.9rem' }}>{dispatchedOtp}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            style={{
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
              color: '#15803D',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Check size={12} /> Auto-Fill
          </button>
        </div>
      ) : (
        <div style={{ fontSize: '0.72rem', color: '#64748B', textAlign: 'center', marginTop: '6px' }}>
          Click <strong>"Send OTP"</strong> to generate your real-time 6-digit verification code.
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '0.76rem',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </div>
  );
}
