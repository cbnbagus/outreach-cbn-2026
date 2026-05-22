"use client";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    const handleScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".fade-up").forEach(el => observer.observe(el));
    return () => { window.removeEventListener("scroll", handleScroll); observer.disconnect(); };
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{__html: STYLES}} />
      <div dangerouslySetInnerHTML={{__html: BODY}} />
    </>
  );
}

const STYLES = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy: #0F1B2D;
      --navy-light: #1A2942;
      --navy-lighter: #243B5C;
      --teal: #2DD4BF;
      --teal-dark: #14B8A6;
      --gold: #F59E0B;
      --white: #FFFFFF;
      --off-white: #F8FAFC;
      --gray-100: #F1F5F9;
      --gray-200: #E2E8F0;
      --gray-300: #CBD5E1;
      --gray-400: #94A3B8;
      --gray-500: #64748B;
      --gray-600: #475569;
      --gray-700: #334155;
      --gray-800: #1E293B;
      --red-soft: #FEE2E2;
      --red: #EF4444;
      --font-display: 'DM Serif Display', Georgia, serif;
      --font-body: 'DM Sans', system-ui, sans-serif;
    }

    html { scroll-behavior: smooth; }
    body { font-family: var(--font-body); color: var(--gray-700); background: var(--white); line-height: 1.7; -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }

    /* ── UTILITY ── */
    .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; font-family: var(--font-body); border: none; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: var(--teal); color: var(--navy); }
    .btn-primary:hover { background: var(--teal-dark); transform: translateY(-1px); box-shadow: 0 8px 25px rgba(45,212,191,0.3); }
    .btn-outline { background: transparent; color: var(--white); border: 1.5px solid rgba(255,255,255,0.3); }
    .btn-outline:hover { border-color: var(--teal); color: var(--teal); }
    .btn-dark { background: var(--navy); color: var(--white); }
    .btn-dark:hover { background: var(--navy-light); transform: translateY(-1px); box-shadow: 0 8px 25px rgba(15,27,45,0.3); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 100px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }

    /* ── NAV ── */
    nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 16px 0; transition: all 0.3s; }
    nav.scrolled { background: rgba(15,27,45,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.08); }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { display: flex; align-items: center; gap: 10px; }
    .nav-logo-icon { width: 36px; height: 36px; background: var(--teal); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .nav-logo-icon svg { width: 18px; height: 18px; fill: var(--navy); }
    .nav-logo-text { font-family: var(--font-display); font-size: 18px; color: var(--white); }
    .nav-links { display: flex; align-items: center; gap: 32px; }
    .nav-links a { color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover { color: var(--white); }
    .nav-cta { display: flex; gap: 10px; align-items: center; }
    .nav-cta .btn { padding: 10px 20px; font-size: 13px; }
    @media (max-width: 768px) { .nav-links { display: none; } }

    /* ── HERO ── */
    .hero { background: linear-gradient(165deg, var(--navy) 0%, var(--navy-light) 50%, var(--navy-lighter) 100%); padding: 160px 0 100px; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; top: -50%; right: -20%; width: 800px; height: 800px; background: radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%); pointer-events: none; }
    .hero::after { content: ''; position: absolute; bottom: -30%; left: -10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%); pointer-events: none; }
    .hero-content { position: relative; z-index: 2; max-width: 720px; }
    .hero .badge { background: rgba(45,212,191,0.15); color: var(--teal); border: 1px solid rgba(45,212,191,0.25); margin-bottom: 28px; }
    .hero h1 { font-family: var(--font-display); font-size: clamp(36px, 5.5vw, 64px); color: var(--white); line-height: 1.15; margin-bottom: 24px; }
    .hero h1 em { font-style: normal; color: var(--teal); }
    .hero p.sub { font-size: 18px; color: rgba(255,255,255,0.6); line-height: 1.7; margin-bottom: 36px; max-width: 560px; }
    .hero-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
    .hero-stats { display: flex; gap: 48px; margin-top: 64px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.08); }
    .hero-stat { text-align: left; }
    .hero-stat .num { font-family: var(--font-display); font-size: 36px; color: var(--teal); }
    .hero-stat .label { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 4px; }
    @media (max-width: 640px) { .hero-stats { gap: 24px; } .hero-stat .num { font-size: 28px; } }

    /* ── PAIN SECTION ── */
    .pain { padding: 100px 0; background: var(--off-white); }
    .pain-header { text-align: center; max-width: 640px; margin: 0 auto 60px; }
    .pain-header h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px); color: var(--navy); line-height: 1.2; margin-bottom: 16px; }
    .pain-header p { font-size: 16px; color: var(--gray-500); }
    .pain-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
    .pain-card { background: var(--white); border-radius: 16px; padding: 32px; border: 1px solid var(--gray-200); position: relative; overflow: hidden; }
    .pain-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--red); opacity: 0.6; }
    .pain-card .icon { width: 48px; height: 48px; background: var(--red-soft); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 22px; }
    .pain-card h3 { font-family: var(--font-display); font-size: 20px; color: var(--navy); margin-bottom: 8px; }
    .pain-card p { font-size: 14px; color: var(--gray-500); line-height: 1.7; }
    .pain-card .stat { font-family: var(--font-display); font-size: 32px; color: var(--red); margin-bottom: 4px; }

    /* ── SOLUTION ── */
    .solution { padding: 100px 0; background: var(--white); }
    .solution-header { text-align: center; max-width: 640px; margin: 0 auto 60px; }
    .solution-header .badge { background: rgba(45,212,191,0.1); color: var(--teal-dark); border: 1px solid rgba(45,212,191,0.2); margin-bottom: 20px; }
    .solution-header h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px); color: var(--navy); line-height: 1.2; margin-bottom: 16px; }
    .solution-header p { font-size: 16px; color: var(--gray-500); }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
    .feature-card { padding: 32px; border-radius: 16px; border: 1px solid var(--gray-200); transition: all 0.3s; }
    .feature-card:hover { border-color: var(--teal); box-shadow: 0 8px 30px rgba(45,212,191,0.08); transform: translateY(-2px); }
    .feature-card .icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 22px; }
    .feature-card h3 { font-family: var(--font-display); font-size: 20px; color: var(--navy); margin-bottom: 8px; }
    .feature-card p { font-size: 14px; color: var(--gray-500); line-height: 1.7; }
    .fc-teal .icon { background: rgba(45,212,191,0.1); }
    .fc-gold .icon { background: rgba(245,158,11,0.1); }
    .fc-blue .icon { background: rgba(59,130,246,0.1); }
    .fc-purple .icon { background: rgba(139,92,246,0.1); }
    .fc-green .icon { background: rgba(16,185,129,0.1); }
    .fc-orange .icon { background: rgba(249,115,22,0.1); }

    /* ── HOW IT WORKS ── */
    .how { padding: 100px 0; background: var(--navy); color: var(--white); }
    .how-header { text-align: center; max-width: 640px; margin: 0 auto 60px; }
    .how-header h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px); line-height: 1.2; margin-bottom: 16px; }
    .how-header p { font-size: 16px; color: rgba(255,255,255,0.5); }
    .how-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 32px; counter-reset: step; }
    .how-step { text-align: center; counter-increment: step; }
    .how-step::before { content: counter(step); display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 16px; background: rgba(45,212,191,0.15); color: var(--teal); font-family: var(--font-display); font-size: 24px; margin: 0 auto 20px; }
    .how-step h3 { font-family: var(--font-display); font-size: 20px; margin-bottom: 8px; }
    .how-step p { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.7; }

    /* ── TESTIMONIAL / SCENARIO ── */
    .scenario { padding: 100px 0; background: var(--off-white); }
    .scenario-header { text-align: center; max-width: 640px; margin: 0 auto 60px; }
    .scenario-header h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px); color: var(--navy); line-height: 1.2; margin-bottom: 16px; }
    .scenario-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
    .scenario-card { background: var(--white); border-radius: 16px; padding: 32px; border: 1px solid var(--gray-200); }
    .scenario-card .time { font-size: 12px; font-weight: 600; color: var(--gray-400); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .scenario-card h3 { font-family: var(--font-display); font-size: 18px; color: var(--navy); margin-bottom: 12px; }
    .scenario-card p { font-size: 14px; color: var(--gray-500); line-height: 1.7; }
    .scenario-card .result { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-200); display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--teal-dark); }
    .scenario-card .result svg { width: 16px; height: 16px; fill: var(--teal-dark); }

    /* ── PRICING ── */
    .pricing { padding: 100px 0; background: var(--white); }
    .pricing-header { text-align: center; max-width: 640px; margin: 0 auto 60px; }
    .pricing-header h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 42px); color: var(--navy); line-height: 1.2; margin-bottom: 16px; }
    .pricing-header p { font-size: 16px; color: var(--gray-500); }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; max-width: 960px; margin: 0 auto; }
    .price-card { border-radius: 16px; padding: 28px; border: 1.5px solid var(--gray-200); position: relative; }
    .price-card.popular { border-color: var(--teal); background: linear-gradient(180deg, rgba(45,212,191,0.03), transparent); }
    .price-card.popular::before { content: 'MOST POPULAR'; position: absolute; top: -1px; left: 50%; transform: translateX(-50%); background: var(--teal); color: var(--navy); font-size: 10px; font-weight: 700; padding: 4px 14px; border-radius: 0 0 8px 8px; letter-spacing: 0.5px; }
    .price-card h3 { font-family: var(--font-display); font-size: 22px; color: var(--navy); margin-bottom: 4px; }
    .price-card .amount { font-family: var(--font-display); font-size: 36px; color: var(--navy); margin: 12px 0 4px; }
    .price-card .amount span { font-size: 14px; font-family: var(--font-body); color: var(--gray-400); font-weight: 400; }
    .price-card .desc { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
    .price-card ul { list-style: none; margin-bottom: 24px; }
    .price-card ul li { font-size: 13px; color: var(--gray-600); padding: 5px 0; padding-left: 22px; position: relative; }
    .price-card ul li::before { content: '✓'; position: absolute; left: 0; color: var(--teal-dark); font-weight: 700; }
    .price-card .btn { width: 100%; justify-content: center; padding: 12px; font-size: 14px; }

    /* ── CTA ── */
    .cta { padding: 100px 0; background: linear-gradient(165deg, var(--navy), var(--navy-lighter)); text-align: center; position: relative; overflow: hidden; }
    .cta::before { content: ''; position: absolute; top: 50%; left: 50%; width: 600px; height: 600px; transform: translate(-50%,-50%); background: radial-gradient(circle, rgba(45,212,191,0.1), transparent 70%); pointer-events: none; }
    .cta h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 48px); color: var(--white); line-height: 1.2; margin-bottom: 16px; position: relative; z-index: 2; }
    .cta p { font-size: 18px; color: rgba(255,255,255,0.5); margin-bottom: 36px; position: relative; z-index: 2; max-width: 480px; margin-left: auto; margin-right: auto; }
    .cta .btn { position: relative; z-index: 2; }

    /* ── FOOTER ── */
    footer { background: var(--gray-800); padding: 48px 0 24px; }
    .footer-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; flex-wrap: wrap; margin-bottom: 32px; }
    .footer-brand { max-width: 280px; }
    .footer-brand .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .footer-brand .logo-icon { width: 32px; height: 32px; background: var(--teal); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .footer-brand .logo-icon svg { width: 14px; height: 14px; fill: var(--navy); }
    .footer-brand .logo-text { font-family: var(--font-display); font-size: 16px; color: var(--white); }
    .footer-brand p { font-size: 13px; color: var(--gray-400); line-height: 1.7; }
    .footer-links { display: flex; gap: 48px; }
    .footer-links h4 { font-size: 12px; font-weight: 600; color: var(--gray-400); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .footer-links a { display: block; font-size: 13px; color: var(--gray-400); padding: 4px 0; transition: color 0.2s; }
    .footer-links a:hover { color: var(--white); }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; }
    .footer-bottom p { font-size: 12px; color: var(--gray-500); }
    @media (max-width: 640px) { .footer-links { gap: 24px; } .footer-top { flex-direction: column; } }

    /* ── CONTACT ── */
    .contact { padding: 100px 0; background: var(--white); }
    .contact-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
    .contact-text h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 38px); color: var(--navy); line-height: 1.2; margin-bottom: 16px; }
    .contact-text p { font-size: 15px; color: var(--gray-500); line-height: 1.7; margin-bottom: 28px; }
    .contact-channels { display: flex; flex-direction: column; gap: 12px; }
    .contact-card { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 12px; border: 1.5px solid var(--gray-200); transition: all 0.2s; cursor: pointer; }
    .contact-card:hover { border-color: var(--teal); box-shadow: 0 4px 16px rgba(45,212,191,0.1); transform: translateY(-1px); }
    .contact-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .contact-card div { flex: 1; }
    .contact-card strong { display: block; font-size: 14px; color: var(--navy); }
    .contact-card span { font-size: 12px; color: var(--gray-400); }
    .contact-card .arrow { color: var(--gray-300); flex-shrink: 0; transition: all 0.2s; }
    .contact-card:hover .arrow { color: var(--teal); transform: translateX(3px); }
    .contact-faq h3 { font-family: var(--font-display); font-size: 22px; color: var(--navy); margin-bottom: 16px; }
    .contact-faq details { border-bottom: 1px solid var(--gray-200); }
    .contact-faq summary { padding: 16px 0; font-size: 14px; font-weight: 600; color: var(--navy); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
    .contact-faq summary::after { content: '+'; font-size: 20px; color: var(--gray-400); font-weight: 300; transition: transform 0.2s; }
    .contact-faq details[open] summary::after { content: '−'; color: var(--teal); }
    .contact-faq details p { padding: 0 0 16px; font-size: 13px; color: var(--gray-500); line-height: 1.7; }
    @media (max-width: 768px) { .contact-inner { grid-template-columns: 1fr; gap: 40px; } }

    /* ── FLOATING WHATSAPP ── */
    .wa-float { position: fixed; bottom: 24px; right: 24px; z-index: 999; display: flex; align-items: center; gap: 10px; background: #25D366; color: white; padding: 12px 20px 12px 14px; border-radius: 50px; box-shadow: 0 4px 20px rgba(37,211,102,0.4); transition: all 0.3s; text-decoration: none; }
    .wa-float:hover { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(37,211,102,0.5); }
    .wa-float-label { font-size: 14px; font-weight: 600; font-family: var(--font-body); }
    @media (max-width: 640px) { .wa-float { padding: 14px; border-radius: 50%; } .wa-float-label { display: none; } }

    /* ── ANIMATIONS ── */
    .fade-up { opacity: 0; transform: translateY(30px); transition: all 0.6s ease-out; }
    .fade-up.visible { opacity: 1; transform: translateY(0); }
    .fade-up:nth-child(2) { transition-delay: 0.1s; }
    .fade-up:nth-child(3) { transition-delay: 0.2s; }
    .fade-up:nth-child(4) { transition-delay: 0.3s; }
    .fade-up:nth-child(5) { transition-delay: 0.35s; }
    .fade-up:nth-child(6) { transition-delay: 0.4s; }
  `;

const BODY = `

<!-- NAV -->
<nav id="nav">
  <div class="container nav-inner">
    <a href="#" class="nav-logo">
      <div class="nav-logo-icon"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
      <span class="nav-logo-text">ReachTheSoul</span>
    </a>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#how">How It Works</a>
      <a href="#pricing">Pricing</a>
      <a href="#contact">Contact</a>
    </div>
    <div class="nav-cta">
      <a href="/login" class="btn btn-outline">Sign In</a>
      <a href="/register" class="btn btn-primary">Start Free</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="container hero-content">
    <div class="badge">🙏 Prayer & Counseling Platform</div>
    <h1>Every prayer <em>heard</em>.<br />Every soul <em>cared for</em>.</h1>
    <p class="sub">Someone just messaged your church at 2 AM: <em>"I can't do this anymore."</em> Who responds? ReachTheSoul ensures no message goes unanswered — with AI that provides immediate care and empathy, and seamless escalation to human counselors for prayer, deeper counseling, or urgent visits.</p>
    <div class="hero-buttons">
      <a href="/register" class="btn btn-primary">Start Free — No Credit Card →</a>
      <a href="#how" class="btn btn-outline">See How It Works</a>
    </div>
    <div class="hero-stats">
      <div class="hero-stat"><div class="num">24/7</div><div class="label">AI First Response</div></div>
      <div class="hero-stat"><div class="num">3 min</div><div class="label">Avg. Response Time</div></div>
      <div class="hero-stat"><div class="num">100%</div><div class="label">Follow-up Rate</div></div>
    </div>
  </div>
</section>

<!-- PAIN POINTS -->
<section class="pain">
  <div class="container">
    <div class="pain-header">
      <h2>The crisis most churches don't talk about</h2>
      <p>Your church receives dozens of prayer requests and counseling messages every week. How many actually get a response?</p>
    </div>
    <div class="pain-grid">
      <div class="pain-card fade-up">
        <div class="icon">😔</div>
        <div class="stat">80%</div>
        <h3>Messages go unanswered</h3>
        <p>Most churches lack the system and staff to respond to every prayer request. Messages pile up in WhatsApp, DMs, and email — and people give up waiting.</p>
      </div>
      <div class="pain-card fade-up">
        <div class="icon">🕐</div>
        <div class="stat">24+ hrs</div>
        <h3>Response time too slow</h3>
        <p>When someone is in crisis, 24 hours feels like an eternity. By the time your team replies, the moment has passed — and so has the opportunity to help.</p>
      </div>
      <div class="pain-card fade-up">
        <div class="icon">📋</div>
        <div class="stat">0</div>
        <h3>No follow-up system</h3>
        <p>You prayed with someone last month. How are they now? Without a system, follow-up depends on memory — and memory fails. Souls fall through the cracks.</p>
      </div>
    </div>
  </div>
</section>

<!-- SOLUTION / FEATURES -->
<section class="solution" id="features">
  <div class="container">
    <div class="solution-header">
      <div class="badge">✨ The Solution</div>
      <h2>A platform built for prayer, not paperwork</h2>
      <p>ReachTheSoul gives your prayer and counseling team superpowers — without replacing the human touch that makes ministry meaningful.</p>
    </div>
    <div class="features">
      <div class="feature-card fc-teal fade-up">
        <div class="icon">🤖</div>
        <h3>AI First Responder — Human When It Matters</h3>
        <p>Our AI provides immediate, empathetic care responses 24/7 — acknowledging every message, showing genuine concern, and gathering context. When someone needs prayer, deeper counseling, or an urgent visit, it seamlessly escalates to your human team. No soul waits. No message ignored.</p>
      </div>
      <div class="feature-card fc-gold fade-up">
        <div class="icon">💬</div>
        <h3>Omnichannel Inbox</h3>
        <p>WhatsApp, Instagram DM, Facebook Messenger, website chat — all prayer requests flow into one unified inbox. Your team sees everything in one place, nothing gets lost.</p>
      </div>
      <div class="feature-card fc-blue fade-up">
        <div class="icon">📊</div>
        <h3>Counseling Journal</h3>
        <p>Every conversation is documented. Every counselor can see the full history of a person's journey — from first prayer request to ongoing pastoral care. Notes auto-merge across all interactions.</p>
      </div>
      <div class="feature-card fc-purple fade-up">
        <div class="icon">🚨</div>
        <h3>Crisis Detection</h3>
        <p>AI automatically detects messages about self-harm, suicidal thoughts, or severe distress — and immediately escalates to your on-call counselor. Response time: seconds, not hours.</p>
      </div>
      <div class="feature-card fc-green fade-up">
        <div class="icon">📖</div>
        <h3>AI Trained on Your Doctrine</h3>
        <p>Every denomination is different. Configure the AI to respond according to your church's theology, values, and pastoral approach. Whether Reformed, Charismatic, Catholic, or Evangelical — the AI speaks your language and respects your beliefs.</p>
      </div>
      <div class="feature-card fc-orange fade-up">
        <div class="icon">👥</div>
        <h3>Team & Call Management</h3>
        <p>Assign counselors, set up shift schedules, manage workload. Built-in softphone for voice calls with recording and call logs. Invite your team with a link — they're up and running in minutes.</p>
      </div>
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section class="how" id="how">
  <div class="container">
    <div class="how-header">
      <h2>How it works</h2>
      <p>From incoming message to pastoral care — in three simple steps.</p>
    </div>
    <div class="how-steps">
      <div class="how-step fade-up">
        <h3>Message comes in</h3>
        <p>Someone sends a prayer request via WhatsApp, Instagram, Facebook, or your website chat. ReachTheSoul captures it instantly — day or night.</p>
      </div>
      <div class="how-step fade-up">
        <h3>AI responds with care</h3>
        <p>Our AI — trained on your church's doctrine — immediately acknowledges the message with empathy and warmth. It gathers context, provides comfort, and identifies if the person needs prayer, counseling, or urgent help.</p>
      </div>
      <div class="how-step fade-up">
        <h3>Human counselor steps in</h3>
        <p>When prayer, deeper counseling, or a personal visit is needed, the system seamlessly connects the person with your human team. The counselor sees full context — no awkward re-explanations.</p>
      </div>
      <div class="how-step fade-up">
        <h3>Follow-up, always</h3>
        <p>No one is forgotten. The system tracks progress, schedules follow-ups, and ensures every soul receives ongoing care — from first prayer to faithful community member.</p>
      </div>
    </div>
  </div>
</section>

<!-- SCENARIOS -->
<section class="scenario">
  <div class="container">
    <div class="scenario-header">
      <h2>Real scenarios. Real impact.</h2>
    </div>
    <div class="scenario-grid">
      <div class="scenario-card fade-up">
        <div class="time">Tuesday, 2:17 AM</div>
        <h3>"I don't want to live anymore"</h3>
        <p>A teenager messages your church Instagram. Without ReachTheSoul, this message sits unread until morning. With ReachTheSoul, AI immediately responds with genuine care, detects the crisis, and alerts your on-call counselor for prayer and immediate intervention — within 30 seconds.</p>
        <div class="result"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Human counselor connected in under 2 minutes</div>
      </div>
      <div class="scenario-card fade-up">
        <div class="time">Sunday, 11:45 PM</div>
        <h3>"Can someone pray for my marriage?"</h3>
        <p>A church member WhatsApps after a fight with their spouse. The AI responds with care and understanding, lets them know they are heard, and immediately flags the message for your marriage counselor to follow up first thing Monday morning.</p>
        <div class="result"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Counselor alerted. Follow-up scheduled automatically.</div>
      </div>
      <div class="scenario-card fade-up">
        <div class="time">Every day, all year</div>
        <h3>100 prayer requests per week</h3>
        <p>Your growing church receives more messages than your 3-person team can handle. ReachTheSoul handles initial responses, categorizes requests, assigns to the right counselor, and ensures 100% follow-up — without burning out your team.</p>
        <div class="result"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Zero messages missed. Zero burnout.</div>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="pricing">
  <div class="container">
    <div class="pricing-header">
      <h2>Simple, transparent pricing</h2>
      <p>Start free. Upgrade when you're ready. No contracts, cancel anytime.</p>
    </div>
    <div class="pricing-grid">
      <div class="price-card">
        <h3>Free</h3>
        <div class="amount">$0</div>
        <div class="desc">Try it out. Website chat only.</div>
        <ul>
          <li>1 user</li>
          <li>50 respondents</li>
          <li>Website chat widget</li>
          <li>Basic reporting</li>
          <li>All data stored securely</li>
        </ul>
        <a href="/register" class="btn btn-dark">Get Started Free</a>
      </div>
      <div class="price-card">
        <h3>Starter</h3>
        <div class="amount">$29<span>/mo</span></div>
        <div class="desc">WhatsApp + AI. For most churches.</div>
        <ul>
          <li>3 users</li>
          <li>500 respondents</li>
          <li>300 AI conversations/mo</li>
          <li>500 WhatsApp conversations</li>
          <li>Unlimited incoming messages</li>
          <li>AI auto-reply + escalation</li>
          <li>AI trainable to your doctrine</li>
          <li>Team management</li>
          <li>CSV export</li>
        </ul>
        <a href="/register" class="btn btn-dark">Start with Starter</a>
      </div>
      <div class="price-card popular">
        <h3>Growth</h3>
        <div class="amount">$97<span>/mo</span></div>
        <div class="desc">Omnichannel + advanced AI.</div>
        <ul>
          <li>15 users</li>
          <li>2,000 respondents</li>
          <li>1,500 AI conversations/mo</li>
          <li>1,000 WhatsApp conversations</li>
          <li>Instagram, Facebook, TikTok DM</li>
          <li>24/7 AI counselor (advanced)</li>
          <li>Call integration available ($49 setup)</li>
          <li>Advanced analytics</li>
          <li>Priority support</li>
        </ul>
        <a href="/register" class="btn btn-primary">Start with Growth</a>
      </div>
      <div class="price-card">
        <h3>Enterprise</h3>
        <div class="amount">$249<span>+/mo</span></div>
        <div class="desc">For large organizations.</div>
        <ul>
          <li>Unlimited users</li>
          <li>Unlimited respondents</li>
          <li>5,000 AI conversations/mo</li>
          <li>3,000 WhatsApp conversations</li>
          <li>All channels + API access</li>
          <li>Custom branding & white-label</li>
          <li>Call integration included</li>
          <li>AI trained on your doctrine</li>
          <li>Dedicated account manager</li>
          <li>SLA guarantee</li>
          <li>Priority onboarding</li>
        </ul>
        <a href="mailto:hello@reachthesoul.org?subject=Enterprise%20Inquiry" class="btn btn-dark">Contact Sales</a>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta">
  <div class="container">
    <h2>Someone is reaching out<br />right now.</h2>
    <p>Will they find an empty inbox — or a ministry that cares? Start responding to every soul today.</p>
    <a href="/register" class="btn btn-primary" style="font-size:17px;padding:16px 36px;">Start Free — Takes 2 Minutes →</a>
  </div>
</section>

<!-- CONTACT -->
<section class="contact" id="contact">
  <div class="container">
    <div class="contact-inner">
      <div class="contact-text">
        <h2>Have questions? Let's talk.</h2>
        <p>Not sure if ReachTheSoul is right for your church? Want a live demo? Need help with setup? Our team is here to help — no pressure, no sales pitch. Just a conversation about how we can serve your ministry.</p>
        <div class="contact-channels">
          <a href="https://wa.me/6285974773341?text=Hi%2C%20I%27m%20interested%20in%20ReachTheSoul%20for%20my%20church.%20Can%20you%20tell%20me%20more%3F" target="_blank" class="contact-card">
            <div class="contact-icon" style="background:#25D366;">
              <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            <div>
              <strong>Chat on WhatsApp</strong>
              <span>Quick response, usually within minutes</span>
            </div>
            <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a href="mailto:hello@reachthesoul.org?subject=Question%20about%20ReachTheSoul" class="contact-card">
            <div class="contact-icon" style="background:var(--navy-lighter);">
              <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6" fill="none" stroke="white" stroke-width="2"/></svg>
            </div>
            <div>
              <strong>Email Us</strong>
              <span>hello@reachthesoul.org</span>
            </div>
            <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
      <div class="contact-faq">
        <h3>Common questions</h3>
        <details>
          <summary>Is my congregation's data safe and private?</summary>
          <p>Absolutely. All data is encrypted, stored securely, and isolated per organization. No other church or ministry can access your data. We take confidentiality as seriously as you do.</p>
        </details>
        <details>
          <summary>Can the AI be trained on our specific theology?</summary>
          <p>Yes! You can customize the AI's system prompt to align with your church's doctrine, values, and pastoral approach. The AI will respond in accordance with your beliefs — whether Reformed, Charismatic, Catholic, Evangelical, or any tradition.</p>
        </details>
        <details>
          <summary>Does the AI replace human counselors?</summary>
          <p>Never. The AI serves as a first responder — providing immediate care and empathy so no message goes unanswered. For prayer, deeper counseling, or urgent situations, it seamlessly escalates to your human team. The human touch remains at the heart of every ministry interaction.</p>
        </details>
        <details>
          <summary>What channels does it support?</summary>
          <p>WhatsApp, Instagram DM, Facebook Messenger, website chat, and voice calls (via your own telephony provider). All messages flow into one unified inbox for your counseling team.</p>
        </details>
        <details>
          <summary>Can we try it before committing?</summary>
          <p>Yes! The Free plan is free forever — no credit card required. Start with website chat, explore the platform, and upgrade whenever you're ready.</p>
        </details>
      </div>
    </div>
  </div>
</section>

<!-- FLOATING WHATSAPP BUTTON -->
<a href="https://wa.me/6285974773341?text=Hi%2C%20I%27m%20interested%20in%20ReachTheSoul%20for%20my%20church.%20Can%20you%20tell%20me%20more%3F" target="_blank" class="wa-float" aria-label="Chat on WhatsApp">
  <svg viewBox="0 0 24 24" fill="white" width="26" height="26"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  <span class="wa-float-label">Chat with us</span>
</a>

<!-- FOOTER -->
<footer>
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <div class="logo">
          <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
          <span class="logo-text">ReachTheSoul</span>
        </div>
        <p>AI-powered prayer and counseling platform for churches and ministries. Every prayer heard. Every soul cared for.</p>
      </div>
      <div class="footer-links">
        <div>
          <h4>Product</h4>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="/login">Sign In</a>
          <a href="/register">Sign Up Free</a>
        </div>
        <div>
          <h4>Resources</h4>
          <a href="mailto:hello@reachthesoul.org">Contact Us</a>
          <a href="mailto:hello@reachthesoul.org">Partner With Us</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 ReachTheSoul. Where every soul finds care.</p>
    </div>
  </div>
</footer>

<script>
// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
</script>

`;
