import { useState, useEffect, useRef } from "react";

// Tier limits — soft caps protect margin while feeling generous
const LIMITS = {
  free: { daily: 10, videosMonthly: 1, label: "10 messages/day" },
  pro: { daily: 100, videosMonthly: 15, label: "100 messages/day" },
  gym: { daily: 500, videosMonthly: 50, label: "500 messages/day" },
};

// Hybrid model strategy — cheaper model for simple tasks, premium for video
const MODEL_CHAT = "claude-haiku-4-5-20251001"; // ~5x cheaper for chat + quizzes
const MODEL_VIDEO = "claude-sonnet-4-20250514"; // Premium for video analysis

const SYSTEM_PROMPT = `You are Coach — an elite combat sports coach AI inside CornerAI. Your job is to analyze training footage for various combat sports (including Boxing, MMA, Muay Thai, and Brazilian Jiu-Jitsu) and teach fighters real, actionable feedback.

RULES FOR VIDEO ANALYSIS:
1. When frames are provided, FIRST describe what you can clearly see: number of fighters, their gear colors (gloves, shorts, headgear), the setting (ring, gym, bag work).
2. If you cannot clearly identify which fighter is the user, ASK FIRST: "I see [describe what you see]. Which fighter are you — the one in [color] or [color]?"
3. Only give technical feedback AFTER user confirms which fighter they are.
4. Do NOT guess or make up details about gear, technique, or moments you cannot clearly see.
5. If image quality is poor or fighters are similar, SAY SO honestly: "I can see general movement but can't make out specific technique details — can you tell me what moment to focus on?"
6. When you DO give feedback, be specific to what you actually observed: stance, foot position, hand placement, distance, defense.
7. After confirmed analysis, drop a drill: "This week, work on [specific thing] for 50 reps daily."

RULES FOR CHAT:
1. Answer combat sports questions clearly, directly, like a real coach texting a fighter. No fluff.
2. After teaching something meaningful, ALWAYS follow with a quiz. Don't ask permission. Just drop it.
3. Quiz format (exactly this, on new lines):

QUIZ:
Q: [question]
A) [option]
B) [option]
C) [option]
D) [option]
ANSWER: [letter]
EXPLANATION: [1 sentence why, coaching tone]

4. Correct answer → acknowledge briefly, continue teaching OR ask what they want to learn next.
5. Wrong answer → correct them, re-explain simply, quiz again on same concept. Don't move on.
6. Keep all messages under 4 sentences before a quiz.
7. Never break character. You are Coach.
8. NEVER lie or hallucinate. If you don't know, say so.`;

const STYLES = `
 @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
 *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 :root {
 --bg: #080808; --card: #161616; --border: #222; --border-light: #2a2a2a;
 --red: #e63946; --red-dim: rgba(230,57,70,0.08); --red-glow: rgba(230,57,70,0.3);
 --gold: #f4b942; --green: #00d68f;
 --white: #f2f2f2; --gray: #555; --gray-light: #888;
 --mono: 'DM Mono', monospace; --sans: 'DM Sans', sans-serif; --display: 'Bebas Neue', sans-serif;
 }
 html, body { height: 100%; background: var(--bg); color: var(--white); font-family: var(--sans); }

 .landing { min-height: 100vh; padding: 40px 20px 80px; max-width: 760px; margin: 0 auto; }
 .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 60px; }
 .logo { font-family: var(--display); font-size: 26px; letter-spacing: 2px; color: var(--red); line-height: 1; }
 .logo span { color: var(--white); }
 .nav-btn { background: transparent; border: 1px solid var(--border-light); color: var(--white); padding: 10px 18px; border-radius: 8px; font-family: var(--sans); font-size: 13px; cursor: pointer; transition: all 0.15s; }
 .nav-btn:hover { border-color: var(--red); background: var(--red-dim); }

 .hero { text-align: center; padding: 20px 0 50px; }
 .hero-tag { font-family: var(--mono); font-size: 11px; letter-spacing: 3px; color: var(--red); text-transform: uppercase; margin-bottom: 20px; }
 .hero-headline { font-family: var(--display); font-size: clamp(38px, 7vw, 62px); line-height: 0.95; letter-spacing: 1px; margin-bottom: 24px; }
 .hero-headline span { color: var(--red); }
 .hero-sub { font-size: 17px; line-height: 1.6; color: var(--gray-light); max-width: 520px; margin: 0 auto 36px; }
 .cta-wrap { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
 .cta { background: var(--red); color: white; padding: 16px 32px; border-radius: 10px; border: none; font-family: var(--sans); font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 40px var(--red-glow); }
 .cta:hover { background: #ff4757; transform: translateY(-2px); }

 .problem-section { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 36px 28px; margin-bottom: 40px; }
 .problem-quote { font-family: var(--display); font-size: 28px; line-height: 1.2; letter-spacing: 1px; margin-bottom: 14px; }
 .problem-quote span { color: var(--red); }
 .problem-text { font-size: 15px; line-height: 1.7; color: var(--gray-light); }

 .features { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 40px; }
 @media (max-width: 520px) { .features { grid-template-columns: 1fr; } }
 .feat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px 20px; }
 .feat-icon { font-size: 28px; margin-bottom: 10px; display: block; }
 .feat-title { font-family: var(--display); font-size: 20px; letter-spacing: 1px; margin-bottom: 8px; }
 .feat-desc { font-size: 13px; line-height: 1.5; color: var(--gray-light); }

 .pricing { margin-bottom: 40px; }
 .section-title { font-family: var(--display); font-size: 36px; letter-spacing: 2px; text-align: center; margin-bottom: 8px; }
 .section-sub { text-align: center; color: var(--gray-light); font-size: 14px; margin-bottom: 32px; }
 .tiers { display: grid; grid-template-columns: 1fr; gap: 14px; }
 @media (min-width: 720px) { .tiers { grid-template-columns: 1fr 1fr 1fr; } }
 .tier { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
 .tier.pro { border-color: var(--red); position: relative; }
 .tier.pro::before { content: 'MOST POPULAR'; position: absolute; top: -10px; right: 16px; background: var(--red); color: white; font-family: var(--mono); font-size: 9px; letter-spacing: 2px; padding: 4px 10px; border-radius: 4px; }
 .tier-founder-tag { font-family: var(--mono); font-size: 9px; letter-spacing: 2px; color: var(--gold); background: rgba(244,185,66,0.1); border: 1px solid rgba(244,185,66,0.3); padding: 6px 10px; border-radius: 6px; margin-bottom: 10px; text-align: center; display: block; }
 .tier-price-wrap { display: flex; align-items: baseline; gap: 10px; margin-bottom: 2px; }
 .tier-price-old { font-family: var(--display); font-size: 22px; color: var(--gray); text-decoration: line-through; line-height: 1; }
 .founder-count { text-align: center; font-family: var(--mono); font-size: 10px; color: var(--red); margin-top: 10px; letter-spacing: 1px; animation: pulse 2s ease-in-out infinite; }
 .tier-name { font-family: var(--display); font-size: 22px; letter-spacing: 1px; margin-bottom: 4px; }
 .tier-price { font-family: var(--display); font-size: 36px; line-height: 1; margin-bottom: 2px; }
 .tier-price span { font-family: var(--sans); font-size: 13px; color: var(--gray); font-weight: 400; letter-spacing: 0; }
 .tier-tagline { font-size: 12px; color: var(--gray-light); margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
 .tier-features { list-style: none; margin-bottom: 20px; }
 .tier-features li { font-size: 13px; padding: 6px 0; color: var(--gray-light); display: flex; gap: 8px; }
 .tier-features li::before { content: '✓'; color: var(--green); flex-shrink: 0; }
 .tier-btn { width: 100%; padding: 12px; border-radius: 8px; border: none; font-family: var(--sans); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
 .tier-btn.primary { background: var(--red); color: white; }
 .tier-btn.primary:hover { background: #ff4757; }
 .tier-btn.ghost { background: transparent; border: 1px solid var(--border-light); color: var(--white); }

 .app { display: flex; flex-direction: column; height: 100vh; max-width: 720px; margin: 0 auto; background: var(--bg); }
 .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
 .header-left { display: flex; align-items: center; gap: 12px; }
 .back-arrow { background: none; border: none; color: var(--gray-light); cursor: pointer; font-size: 20px; padding: 4px; }
 .logo-sub { font-family: var(--mono); font-size: 9px; letter-spacing: 3px; color: var(--gray); text-transform: uppercase; margin-top: 2px; }
 .header-right { display: flex; align-items: center; gap: 10px; }
 .usage-pill { font-family: var(--mono); font-size: 10px; color: var(--gray-light); background: var(--card); border: 1px solid var(--border-light); padding: 5px 10px; border-radius: 12px; letter-spacing: 1px; }
 .usage-pill.warn { color: var(--gold); border-color: rgba(244,185,66,0.3); }
 .tier-badge { font-family: var(--mono); font-size: 9px; color: var(--gold); background: rgba(244,185,66,0.1); border: 1px solid rgba(244,185,66,0.3); padding: 4px 8px; border-radius: 10px; letter-spacing: 1px; }
 .score-badge { display: flex; align-items: center; gap: 6px; background: var(--card); border: 1px solid var(--border-light); border-radius: 20px; padding: 6px 12px; }
 .score-num { font-family: var(--display); font-size: 18px; color: var(--gold); line-height: 1; }
 .score-label { font-family: var(--mono); font-size: 9px; color: var(--gray); text-transform: uppercase; letter-spacing: 1px; }

 .messages { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; }
 .messages::-webkit-scrollbar { width: 4px; }
 .messages::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }

 .msg { display: flex; flex-direction: column; max-width: 85%; animation: fadeUp 0.3s ease; }
 @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
 .msg.coach { align-self: flex-start; }
 .msg.user { align-self: flex-end; }
 .msg-label { font-family: var(--mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
 .msg.coach .msg-label { color: var(--red); padding-left: 2px; }
 .msg.user .msg-label { color: var(--gray); text-align: right; padding-right: 2px; }
 .msg-bubble { padding: 14px 18px; border-radius: 16px; font-size: 15px; line-height: 1.65; white-space: pre-wrap; }
 .msg.coach .msg-bubble { background: var(--card); border: 1px solid var(--border-light); border-bottom-left-radius: 4px; }
 .msg.user .msg-bubble { background: var(--red); border-bottom-right-radius: 4px; color: white; }

 .video-attach { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--border-light); padding: 10px 14px; border-radius: 10px; margin-top: 6px; font-size: 13px; color: var(--gray-light); }

 .quiz-card { background: var(--card); border: 1px solid var(--border-light); border-left: 3px solid var(--gold); border-radius: 12px; padding: 20px; margin-top: 4px; }
 .quiz-tag { font-family: var(--mono); font-size: 9px; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
 .quiz-tag::before { content:''; display:block; width:16px; height:1px; background:var(--gold); }
 .quiz-q { font-size: 15px; font-weight: 500; margin-bottom: 14px; line-height: 1.5; }
 .quiz-options { display: flex; flex-direction: column; gap: 8px; }
 .quiz-opt { background: var(--bg); border: 1px solid var(--border-light); border-radius: 8px; padding: 12px 16px; font-family: var(--sans); font-size: 14px; color: var(--white); cursor: pointer; text-align: left; transition: all 0.15s; display: flex; align-items: center; gap: 10px; width: 100%; }
 .quiz-opt:hover:not(:disabled) { border-color: var(--red); background: var(--red-dim); }
 .quiz-opt.correct { border-color: var(--green); background: rgba(0,214,143,0.08); color: var(--green); }
 .quiz-opt.wrong { border-color: var(--red); background: var(--red-dim); color: #ff6b6b; }
 .quiz-opt:disabled { cursor: not-allowed; }
 .opt-letter { font-family: var(--mono); font-size: 11px; color: var(--gray); min-width: 16px; }
 .quiz-opt.correct .opt-letter { color: var(--green); }
 .quiz-opt.wrong .opt-letter { color: #ff6b6b; }
 .quiz-feedback { margin-top: 12px; padding: 12px 14px; border-radius: 8px; font-size: 13px; line-height: 1.5; }
 .quiz-feedback.correct { background: rgba(0,214,143,0.08); border: 1px solid rgba(0,214,143,0.2); color: var(--green); }
 .quiz-feedback.wrong { background: var(--red-dim); border: 1px solid rgba(230,57,70,0.2); color: #ff8080; }

 .typing { display: flex; align-items: center; gap: 4px; padding: 14px 18px; background: var(--card); border: 1px solid var(--border-light); border-radius: 16px; border-bottom-left-radius: 4px; width: fit-content; }
 .typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gray); animation: bounce 1.2s ease infinite; }
 .typing-dot:nth-child(2){animation-delay:0.2s;} .typing-dot:nth-child(3){animation-delay:0.4s;}
 @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4;}40%{transform:translateY(-6px);opacity:1;} }

 .welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 40px 20px; text-align: center; gap: 16px; }
 .welcome-icon { font-size: 48px; }
 .welcome-title { font-family: var(--display); font-size: 36px; letter-spacing: 2px; }
 .welcome-title span { color: var(--red); }
 .welcome-sub { font-size: 15px; color: var(--gray-light); max-width: 340px; line-height: 1.6; }
 .starter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; max-width: 420px; margin-top: 8px; }
 .starter-btn { background: var(--card); border: 1px solid var(--border-light); border-radius: 10px; padding: 14px 12px; font-size: 13px; color: var(--gray-light); cursor: pointer; transition: all 0.15s; text-align: left; line-height: 1.4; font-family: var(--sans); }
 .starter-btn:hover { border-color: var(--red); color: var(--white); background: var(--red-dim); }
 .starter-emoji { display: block; font-size: 20px; margin-bottom: 6px; }

 .input-area { padding: 16px 20px 20px; border-top: 1px solid var(--border); background: var(--bg); flex-shrink: 0; }
 .input-wrap { display: flex; align-items: flex-end; gap: 8px; background: var(--card); border: 1px solid var(--border-light); border-radius: 14px; padding: 8px 8px 8px 12px; transition: border-color 0.2s; }
 .input-wrap:focus-within { border-color: var(--red); }
 .attach-btn { width: 38px; height: 38px; border-radius: 10px; background: transparent; border: 1px solid var(--border-light); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--gray-light); font-size: 16px; flex-shrink: 0; transition: all 0.15s; }
 .attach-btn:hover { border-color: var(--red); color: var(--red); }
 .msg-input { flex: 1; background: transparent; border: none; outline: none; font-family: var(--sans); font-size: 15px; color: var(--white); resize: none; max-height: 120px; line-height: 1.5; padding: 8px 4px; }
 .msg-input::placeholder { color: var(--gray); }
 .send-btn { width: 38px; height: 38px; border-radius: 10px; background: var(--red); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; flex-shrink: 0; transition: all 0.15s; }
 .send-btn:hover:not(:disabled) { background: #ff4757; transform: scale(1.05); }
 .send-btn:disabled { background: var(--border-light); cursor: not-allowed; }
 .input-hint { font-family: var(--mono); font-size: 10px; color: var(--gray); text-align: center; margin-top: 10px; letter-spacing: 1px; }
 .pending-video { display: flex; align-items: center; gap: 10px; background: var(--red-dim); border: 1px solid rgba(230,57,70,0.3); padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; font-size: 13px; }
 .pending-video button { background: none; border: none; color: var(--red); cursor: pointer; padding: 0 4px; font-size: 16px; }

 .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
 @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }
 .modal { background: var(--card); border: 1px solid var(--border-light); border-radius: 16px; padding: 32px 24px; max-width: 440px; width: 100%; position: relative; animation: popUp 0.3s ease; }
 @keyframes popUp { from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);} }
 .modal-close { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--gray); cursor: pointer; font-size: 20px; padding: 4px; }
 .modal-icon { font-size: 40px; margin-bottom: 12px; text-align: center; }
 .modal-title { font-family: var(--display); font-size: 28px; letter-spacing: 1px; text-align: center; margin-bottom: 10px; line-height: 1.1; }
 .modal-title span { color: var(--red); }
 .modal-text { font-size: 14px; color: var(--gray-light); text-align: center; line-height: 1.6; margin-bottom: 22px; }
 .modal-price { text-align: center; margin-bottom: 20px; padding: 18px; background: var(--bg); border-radius: 10px; border: 1px solid var(--border); }
 .modal-price-num { font-family: var(--display); font-size: 44px; color: var(--red); line-height: 1; }
 .modal-price-num small { font-size: 18px; color: var(--gray); font-family: var(--sans); }
 .modal-price-label { font-size: 12px; color: var(--gray-light); margin-top: 4px; }
 .modal-features { list-style: none; margin-bottom: 22px; }
 .modal-features li { font-size: 13px; padding: 5px 0; color: var(--gray-light); display: flex; gap: 8px; }
 .modal-features li::before { content: '✓'; color: var(--green); }
 .modal-cta { width: 100%; background: var(--red); color: white; border: none; padding: 14px; border-radius: 10px; font-family: var(--sans); font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.15s; margin-bottom: 8px; }
 .modal-cta:hover { background: #ff4757; }
 .modal-tier-btn { width: 100%; background: transparent; border: 1px solid var(--border-light); color: var(--white); padding: 12px; border-radius: 10px; font-family: var(--sans); font-size: 13px; cursor: pointer; }
 .trial-note { font-size: 11px; color: var(--gray); text-align: center; margin-top: 10px; line-height: 1.5; }

 .error-msg { background: var(--red-dim); border: 1px solid rgba(230,57,70,0.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff8080; margin-top: 8px; text-align: center; }
`;

function parseCoachMessage(text) {
  const quizMatch = text.match(/QUIZ:\s*\n([\s\S]*)/i);
  if (!quizMatch) return { type: "text", content: text.trim() };
  const beforeQuiz = text.replace(/QUIZ:\s*\n[\s\S]*/i, "").trim();
  const quizBlock = quizMatch[1];
  const qMatch = quizBlock.match(/Q:\s*(.+)/i);
  const optMatches = [...quizBlock.matchAll(/([A-D])\)\s*(.+)/gi)];
  const answerMatch = quizBlock.match(/ANSWER:\s*([A-D])/i);
  const explanationMatch = quizBlock.match(/EXPLANATION:\s*(.+)/i);
  if (!qMatch || optMatches.length < 2) return { type: "text", content: text.trim() };
  return {
    type: "quiz",
    preamble: beforeQuiz,
    question: qMatch[1].trim(),
    options: optMatches.map(m => ({ letter: m[1].toUpperCase(), text: m[2].trim() })),
    answer: answerMatch?.[1].toUpperCase() || "A",
    explanation: explanationMatch?.[1].trim() || "",
  };
}

const STARTERS = [
  { emoji: "🥊", text: "How do I set up my right without telegraphing?" },
  { emoji: "🥋", text: "Analyze my takedown defense in wrestling." },
  { emoji: "🦵", text: "How can I improve my low kick technique in Muay Thai?" },
  { emoji: "🤼", text: "Feedback on my guard retention during BJJ rolling." },
  { emoji: "💥", text: "Where are the openings in my opponent's stance (MMA)?" },
];

function Landing({ onStart }) {
  return (
    <div className="landing">
      <div className="nav">
        <div className="logo">Corner<span>AI</span></div>
        <button className="nav-btn" onClick={onStart}>Sign In</button>
      </div>

      <div className="hero">
        <div className="hero-tag">▬ AI Coach for Fighters ▬</div>
        <h1 className="hero-headline">Your Coach<br/>Told You <span>Twice</span>.<br/>You Forgot.</h1>
        <p className="hero-sub">
          You don't have a talent problem. You have a retention problem.
          CornerAI makes every lesson stick — so you actually improve between sessions.
        </p>
        <div className="cta-wrap">
          <button className="cta" onClick={onStart}>Try Free — No Signup</button>
        </div>
        <div style={{ marginTop: 20, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold)', letterSpacing:
