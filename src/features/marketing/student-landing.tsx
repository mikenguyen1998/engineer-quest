import Link from "next/link";
import { ArrowRight, BookOpen, Code2, ShieldCheck, Sparkles } from "lucide-react";

const lessons = ["Semantic HTML", "Responsive CSS", "Accessible forms", "JavaScript events", "DOM updates", "Mini project"];

export function StudentLanding() {
  return <main className="landing-shell">
    <nav className="landing-nav"><Link className="brand" href="/"><Sparkles size={18} /> Engineer Quest</Link><Link className="landing-login" href="/learn">Student sign in</Link></nav>
    <section className="landing-hero"><p className="eyebrow">WEB FOUNDATIONS FOR BEGINNERS</p><h1>Build the web, one small win at a time.</h1><p>Engineer Quest turns HTML, CSS, and JavaScript into guided, hands-on practice. Write code in the browser, run a clear self-check, and save your learning as you go.</p><div className="landing-actions"><Link className="button primary-button" href="/learn">Try lesson one <ArrowRight size={17} /></Link><a className="button secondary-button" href="#curriculum">See the curriculum</a></div><p className="landing-note">No account needed to try the first lesson.</p></section>
    <section className="landing-proof" aria-label="Learning benefits"><article><Code2 /><h2>Code as you learn</h2><p>Starter space, live preview, and drafts saved in your browser.</p></article><article><ShieldCheck /><h2>Know what works</h2><p>Friendly self-checks explain what to fix before you move on.</p></article><article><BookOpen /><h2>Grow with a path</h2><p>Six focused lessons build toward a small accessible project.</p></article></section>
    <section className="curriculum" id="curriculum"><div><p className="eyebrow">THE FIRST COURSE</p><h2>Web Foundations</h2><p>Designed for students starting from zero. Every lesson introduces one idea, then asks you to use it.</p></div><ol>{lessons.map((lesson, index) => <li key={lesson}><span>{String(index + 1).padStart(2, "0")}</span>{lesson}</li>)}</ol></section>
    <section className="portfolio-callout"><p className="eyebrow">BUILT AS A FULL-STACK PRODUCT</p><h2>Practice locally. Save progress when you’re ready.</h2><p>The portfolio demonstrates a public learning experience, browser-based coding workspace, secure magic-link accounts, Supabase-backed progress, and an advanced engineering-practice library.</p><Link className="button primary-button" href="/learn">Open the student workspace <ArrowRight size={17} /></Link></section>
  </main>;
}
