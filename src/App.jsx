import { useState, useEffect, useRef } from "react";

// Tier limits — soft caps protect margin while feeling generous
const LIMITS = {
  free: { daily: 10, videosMonthly: 1, label: "10 messages/day" },
  pro: { daily: 100, videosMonthly: 15, label: "100 messages/day" },
  gym: { daily: 500, videosMonthly: 50, label: "500 messages/day" },
};

// Hybrid model strategy — cheaper model for simple tasks, premium for video
const MODEL_CHAT = "claude-haiku-4-5-20251001";  // ~5x cheaper for chat + quizzes
const MODEL_VIDEO = "claude-sonnet-4-20250514";  // Premium for video analysis

const SYSTEM_PROMPT = `You are Coach — an elite boxing coach AI inside CornerAI. Your job is to teach boxing concepts AND make the fighter actually retain them.

RULES:
1. Answer boxing questions clearly, directly, like a real coach texting a fighter. No fluff. No long paragraphs.
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
6. If they share a sparring/drill video, tie it to lessons you've discussed. Call out specific moments.
7. Keep all messages under 4 sentences before a quiz.
8. Never break character. You are Coach.`;

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
  { emoji: "👁", text: "How do I read my opponent before they throw?" },
  { emoji: "🛡", text: "My chin keeps coming up in sparring. Fix it." },
  { emoji: "👟", text: "How do I use footwork to create angles?" },
  { emoji: "🥊", text: "How do I set up my right without telegraphing?" },
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
        <div style={{ marginTop: 20, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold)', letterSpacing: 2 }}>
          🔥 FOUNDER'S DEAL: $29/MO LOCKED FOR LIFE · {100 - 7} SPOTS LEFT
        </div>
      </div>

      <div className="problem-section">
        <div className="problem-quote">Sick of asking the same questions <span>for years</span>?</div>
        <p className="problem-text">
          You watch the video. You nod along. You think you got it. Next sparring day — same mistake. 
          Same coaching cue. Same frustration. The endless loop ends here.
        </p>
      </div>

      <div className="features">
        <div className="feat-card">
          <span className="feat-icon">💬</span>
          <div className="feat-title">Coach Chat</div>
          <p className="feat-desc">Ask anything. Get real coaching answers. Not fluff.</p>
        </div>
        <div className="feat-card">
          <span className="feat-icon">🧠</span>
          <div className="feat-title">Retention Quizzes</div>
          <p className="feat-desc">Every lesson followed by a quiz. No skipping. It sticks.</p>
        </div>
        <div className="feat-card">
          <span className="feat-icon">🎥</span>
          <div className="feat-title">Video Analysis</div>
          <p className="feat-desc">Upload sparring. Get frame-by-frame coaching feedback.</p>
        </div>
        <div className="feat-card">
          <span className="feat-icon">✅</span>
          <div className="feat-title">Drill Verification</div>
          <p className="feat-desc">Upload drills to prove you fixed it. Real accountability.</p>
        </div>
      </div>

      <div className="pricing">
        <h2 className="section-title">Pricing</h2>
        <p className="section-sub">Start free. Upgrade when you're serious.</p>
        <div className="tiers">
          <div className="tier">
            <div className="tier-name">Free</div>
            <div className="tier-price">$0<span> /month</span></div>
            <div className="tier-tagline">Try the loop</div>
            <ul className="tier-features">
              <li>10 Coach messages per day</li>
              <li>1 video analysis per month</li>
              <li>Basic quizzes</li>
            </ul>
            <button className="tier-btn ghost" onClick={onStart}>Start Free</button>
          </div>

          <div className="tier pro">
            <div className="tier-founder-tag">🔥 FOUNDER'S DEAL · FIRST 100 ONLY</div>
            <div className="tier-name">Pro</div>
            <div className="tier-price-wrap">
              <div className="tier-price-old">$49</div>
              <div className="tier-price">$29<span> /month</span></div>
            </div>
            <div className="tier-tagline">Locked in forever · For serious fighters</div>
            <ul className="tier-features">
              <li>100 Coach messages per day</li>
              <li>15 video analyses per month</li>
              <li>Full retention tracking</li>
              <li>Conversation history saved</li>
              <li><strong style={{color: 'var(--gold)'}}>Price locked for life</strong></li>
            </ul>
            <button className="tier-btn primary" onClick={onStart}>Claim Founder's Price</button>
            <div className="founder-count">{100 - 7} spots left</div>
          </div>

          <div className="tier">
            <div className="tier-name">Gym</div>
            <div className="tier-price">$297<span> /month</span></div>
            <div className="tier-tagline">For gym owners</div>
            <ul className="tier-features">
              <li>500 messages/day per fighter</li>
              <li>50 videos/month per fighter</li>
              <li>Drill verification loop</li>
              <li>Up to 20 fighters</li>
              <li>Coach dashboard + analytics</li>
            </ul>
            <button className="tier-btn ghost" onClick={() => alert("Contact: ryan@cornerai.io")}>Contact Sales</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaywallModal({ reason, tier, onClose, onUpgrade }) {
  const tierLimits = LIMITS[tier];
  const content = {
    messages: {
      icon: "💬",
      title: `Daily Messages Reached`,
      text: tier === "free"
        ? "You've hit your 10 free messages today. Upgrade to Pro for 100 messages/day and level up faster."
        : `You've hit today's ${tierLimits.daily} message cap. Resets tomorrow — or upgrade for more.`,
      cta: "Upgrade to Pro — $29/mo",
    },
    video: {
      icon: "🎥",
      title: "Video Analysis Limit",
      text: tier === "free"
        ? "Free plan gets 1 video per month. Upload 15/month on Pro and get feedback on every session."
        : `You've used all ${tierLimits.videosMonthly} video analyses this month.`,
      cta: "Upgrade to Pro — $29/mo",
    },
  }[reason];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-icon">{content.icon}</div>
        <h2 className="modal-title">{content.title}</h2>
        <p className="modal-text">{content.text}</p>
        <div className="modal-price">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: 2, marginBottom: 8 }}>🔥 FOUNDER'S DEAL</div>
          <div className="modal-price-num">
            <span style={{ fontSize: 22, color: 'var(--gray)', textDecoration: 'line-through', marginRight: 8 }}>$49</span>
            $29<small>/mo</small>
          </div>
          <div className="modal-price-label">Locked in forever · 7-day free trial · Cancel anytime</div>
        </div>
        <ul className="modal-features">
          <li>100 Coach messages per day</li>
          <li>15 video analyses per month</li>
          <li>Full retention tracking + history</li>
          <li>Priority support</li>
        </ul>
        <button className="modal-cta" onClick={onUpgrade}>{content.cta}</button>
        <button className="modal-tier-btn" onClick={onClose}>Maybe later</button>
        <p className="trial-note">Credit card required for trial. We'll email before your first charge.</p>
      </div>
    </div>
  );
}

export default function CornerAIApp() {
  const [screen, setScreen] = useState("landing");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStates, setQuizStates] = useState({});
  const [error, setError] = useState("");
  const [pendingVideo, setPendingVideo] = useState(null);
  const [paywall, setPaywall] = useState(null);
  const [tier, setTier] = useState("free"); // free | pro | gym
  const [usage, setUsage] = useState({
    messages: 0,
    videos: 0,
    lastDailyReset: new Date().toDateString(),
    lastMonthlyReset: new Date().toISOString().slice(0, 7),
  });

  const messagesEndRef = useRef(null);
  const historyRef = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const today = new Date().toDateString();
    const thisMonth = new Date().toISOString().slice(0, 7);
    if (usage.lastDailyReset !== today || usage.lastMonthlyReset !== thisMonth) {
      setUsage({
        messages: usage.lastDailyReset !== today ? 0 : usage.messages,
        videos: usage.lastMonthlyReset !== thisMonth ? 0 : usage.videos,
        lastDailyReset: today,
        lastMonthlyReset: thisMonth,
      });
    }
  }, []);

  const limits = LIMITS[tier];

  async function callCoach(history, useVideoModel = false) {
    const response = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: useVideoModel ? MODEL_VIDEO : MODEL_CHAT,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text || "";
  }

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if ((!userText && !pendingVideo) || loading) return;

    if (usage.messages >= limits.daily) {
      setPaywall("messages");
      return;
    }
    if (pendingVideo && usage.videos >= limits.videosMonthly) {
      setPaywall("video");
      return;
    }

    setInput("");
    setError("");

    let finalText = userText;
    const hasVideo = !!pendingVideo;
    if (pendingVideo) {
      finalText = userText
        ? `${userText}\n\n[Video attached: ${pendingVideo.name}]`
        : `[Video attached: ${pendingVideo.name}] — Analyze this for me.`;
      setUsage(u => ({ ...u, videos: u.videos + 1 }));
    }
    setUsage(u => ({ ...u, messages: u.messages + 1 }));

    const msgId = Date.now();
    setMessages(prev => [...prev, {
      role: "user", id: msgId,
      text: userText || "Analyze this video",
      video: pendingVideo?.name || null,
    }]);
    historyRef.current = [...historyRef.current, { role: "user", content: finalText }];
    setPendingVideo(null);
    setLoading(true);

    try {
      const raw = await callCoach(historyRef.current, hasVideo);
      historyRef.current = [...historyRef.current, { role: "assistant", content: raw }];
      setMessages(prev => [...prev, { role: "coach", id: Date.now(), parsed: parseCoachMessage(raw) }]);
    } catch {
      setError("Couldn't reach Coach. Try again.");
    }
    setLoading(false);
  }

  async function continueAfterQuiz(answerText) {
    if (usage.messages >= limits.daily) {
      setPaywall("messages");
      return;
    }
    setUsage(u => ({ ...u, messages: u.messages + 1 }));
    historyRef.current = [...historyRef.current, { role: "user", content: answerText }];
    setLoading(true);
    try {
      const raw = await callCoach(historyRef.current);
      if (!raw) { setLoading(false); return; }
      historyRef.current = [...historyRef.current, { role: "assistant", content: raw }];
      setMessages(prev => [...prev, { role: "coach", id: Date.now(), parsed: parseCoachMessage(raw) }]);
    } catch {}
    setLoading(false);
  }

  function handleQuizAnswer(msgId, letterIndex, correctLetter) {
    if (quizStates[msgId] || loading) return;
    const chosen = String.fromCharCode(65 + letterIndex);
    const correct = chosen === correctLetter;
    setQuizStates(prev => ({ ...prev, [msgId]: { chosen, correct } }));
    if (correct) setScore(s => s + 10);
    setTimeout(() => continueAfterQuiz(correct ? `Correct — ${chosen}` : `I answered ${chosen}`), 600);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (usage.videos >= limits.videosMonthly) {
      setPaywall("video");
      e.target.value = "";
      return;
    }
    setPendingVideo(file);
    e.target.value = "";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function upgradeToProSim() {
    alert("Stripe checkout would open here.\n\nFor demo: Setting you to Pro tier.");
    setTier("pro");
    setPaywall(null);
  }

  if (screen === "landing") {
    return (
      <>
        <style>{STYLES}</style>
        <Landing onStart={() => setScreen("chat")} />
      </>
    );
  }

  const messagesLeft = Math.max(0, limits.daily - usage.messages);
  const usageWarn = messagesLeft <= 3 && messagesLeft > 0;

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <div className="header">
          <div className="header-left">
            <button className="back-arrow" onClick={() => setScreen("landing")}>←</button>
            <div>
              <div className="logo">Corner<span>AI</span></div>
              <div className="logo-sub">Fight IQ Coach</div>
            </div>
          </div>
          <div className="header-right">
            {tier !== "free" && <div className="tier-badge">{tier.toUpperCase()}</div>}
            <div className={`usage-pill ${usageWarn ? "warn" : ""}`}>
              {messagesLeft} LEFT
            </div>
            {score > 0 && (
              <div className="score-badge">
                <div className="score-num">{score}</div>
                <div className="score-label">IQ</div>
              </div>
            )}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="welcome">
            <div className="welcome-icon">🥊</div>
            <div className="welcome-title">Fight <span>IQ</span></div>
            <div className="welcome-sub">Ask anything. Or upload a sparring video. You'll get quizzed — no skipping.</div>
            <div className="starter-grid">
              {STARTERS.map((s, i) => (
                <button key={i} className="starter-btn" onClick={() => sendMessage(s.text)}>
                  <span className="starter-emoji">{s.emoji}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`msg ${msg.role}`}>
                <div className="msg-label">{msg.role === "user" ? "You" : "Coach"}</div>
                {msg.role === "user" ? (
                  <>
                    <div className="msg-bubble">{msg.text}</div>
                    {msg.video && <div className="video-attach">🎥 {msg.video}</div>}
                  </>
                ) : msg.parsed.type === "text" ? (
                  <div className="msg-bubble">{msg.parsed.content}</div>
                ) : (
                  <>
                    {msg.parsed.preamble && <div className="msg-bubble" style={{ marginBottom: 8 }}>{msg.parsed.preamble}</div>}
                    <div className="quiz-card">
                      <div className="quiz-tag">Quiz Time</div>
                      <div className="quiz-q">{msg.parsed.question}</div>
                      <div className="quiz-options">
                        {msg.parsed.options.map((opt, i) => {
                          const state = quizStates[msg.id];
                          const isCorrect = opt.letter === msg.parsed.answer;
                          const isChosen = state?.chosen === opt.letter;
                          let cls = "quiz-opt";
                          if (state) { if (isCorrect) cls += " correct"; else if (isChosen) cls += " wrong"; }
                          return (
                            <button key={i} className={cls} disabled={!!state || loading}
                              onClick={() => handleQuizAnswer(msg.id, i, msg.parsed.answer)}>
                              <span className="opt-letter">{opt.letter}</span>{opt.text}
                            </button>
                          );
                        })}
                      </div>
                      {quizStates[msg.id] && (
                        <div className={`quiz-feedback ${quizStates[msg.id].correct ? "correct" : "wrong"}`}>
                          {quizStates[msg.id].correct ? "✓ " : "✗ "}{msg.parsed.explanation}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {loading && (
              <div className="msg coach">
                <div className="msg-label">Coach</div>
                <div className="typing">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="input-area">
          {pendingVideo && (
            <div className="pending-video">
              <span>🎥 {pendingVideo.name}</span>
              <button onClick={() => setPendingVideo(null)}>✕</button>
            </div>
          )}
          <div className="input-wrap">
            <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFileSelect} />
            <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Upload video">📎</button>
            <textarea className="msg-input" placeholder={pendingVideo ? "Add a note about the video..." : "Ask your coach anything..."}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} disabled={loading} />
            <button className="send-btn" onClick={() => sendMessage()} disabled={(!input.trim() && !pendingVideo) || loading}>↑</button>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <div className="input-hint">
            {messagesLeft}/{limits.daily} MESSAGES · {Math.max(0, limits.videosMonthly - usage.videos)}/{limits.videosMonthly} VIDEOS LEFT
          </div>
        </div>

        {paywall && <PaywallModal reason={paywall} tier={tier} onClose={() => setPaywall(null)} onUpgrade={upgradeToProSim} />}
      </div>
    </>
  );
}
