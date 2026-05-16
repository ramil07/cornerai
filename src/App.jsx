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
 .tier-founder-tag { font-f
...(truncated)...
