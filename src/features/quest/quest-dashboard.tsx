"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CircleAlert, Clipboard, LockKeyhole, LogOut, Moon, Send, Sparkles, Sun, Target, Trophy, Zap } from "lucide-react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { missions as localMissions, tracks } from "./content";
import { Attempt, CareerLevel, Mission, Profile, TrackId } from "./types";

const storageKey = "engineer-quest-attempts";
const levels: { name: CareerLevel; minimum: number; next: number | null }[] = [
  { name: "Fresher", minimum: 0, next: 200 }, { name: "Mid", minimum: 200, next: 600 },
  { name: "Senior", minimum: 600, next: 1200 }, { name: "Expert", minimum: 1200, next: null },
];
type MissionRow = { id: string; xp: number; prerequisite_ids: string[] };
type AttemptRow = { mission_id: string; answer: string; reflection: string; completed_at: string; awarded_xp: number; repository_url: string | null; demo_url: string | null; test_result: string | null; ai_feedback: string | null; html_code: string | null; css_code: string | null; javascript_code: string | null };
type ProfileRow = { total_xp: number; level: CareerLevel; imported_at: string | null; frontend_xp: number; backend_xp: number; fullstack_xp: number; tester_xp: number };
type Celebration = { mission: Mission; earnedXp: number; promoted: boolean } | null;

function fromMissionRow(row: MissionRow): Mission {
  const mission = localMissions.find((item) => item.id === row.id);
  if (!mission) throw new Error(`Unknown mission returned by Supabase: ${row.id}`);
  return { ...mission, xp: row.xp, prerequisites: row.prerequisite_ids ?? [] };
}
function fromAttemptRow(row: AttemptRow): Attempt { return { missionId: row.mission_id, answer: row.answer, reflection: row.reflection, completedAt: row.completed_at, awardedXp: row.awarded_xp, repositoryUrl: row.repository_url, demoUrl: row.demo_url, testResult: row.test_result, aiFeedback: row.ai_feedback, htmlCode: row.html_code, cssCode: row.css_code, javascriptCode: row.javascript_code }; }
function previewDocument(html: string, css: string, javascript: string) {
  const safeJavascript = javascript.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><style>${css}</style></head><body>${html}<div id="quest-preview-error" hidden></div><script>window.addEventListener('error', function(event) { var box = document.getElementById('quest-preview-error'); box.hidden = false; box.textContent = 'Preview error: ' + event.message; box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:8px;background:#7f1d1d;color:white;font:12px system-ui;z-index:9999'; });<\/script><script>${safeJavascript}<\/script></body></html>`;
}
function draftKey(missionId: string) { return `engineer-quest-code-draft:${missionId}`; }
function readCodeDraft(missionId: string) {
  try { const saved = localStorage.getItem(draftKey(missionId)); return saved ? JSON.parse(saved) as { html: string; css: string; javascript: string } : null; } catch { return null; }
}
function readLegacyAttempts(): Attempt[] { try { const value = localStorage.getItem(storageKey); return value ? (JSON.parse(value) as Attempt[]) : []; } catch { return []; } }
function levelData(level: CareerLevel) { return levels.find((item) => item.name === level) ?? levels[0]; }

export function QuestDashboard() {
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [track, setTrack] = useState<TrackId>("frontend");
  const [selectedMissionId, setSelectedMissionId] = useState("");
  const [answer, setAnswer] = useState("");
  const [reflection, setReflection] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [testResult, setTestResult] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [htmlCode, setHtmlCode] = useState("<main>\n  <h1>My challenge</h1>\n</main>");
  const [cssCode, setCssCode] = useState("");
  const [javascriptCode, setJavascriptCode] = useState("// Write your JavaScript here\n");
  const [previewCode, setPreviewCode] = useState({ html: "<main>\n  <h1>My challenge</h1>\n</main>", css: "", javascript: "// Write your JavaScript here\n" });
  const [editorTab, setEditorTab] = useState<"html" | "css" | "javascript">("html");
  const [challengeQuery, setChallengeQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Mission["type"]>("all");
  const [status, setStatus] = useState("Loading your account…");
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [legacyAttempts, setLegacyAttempts] = useState<Attempt[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);
  const [celebration, setCelebration] = useState<Celebration>(null);

  const loadProgress = async () => {
    const supabase = createSupabaseBrowserClient();
    const [{ data: profileData, error: profileError }, { data: missionData, error: missionError }, { data: attemptData, error: attemptError }] = await Promise.all([
      supabase.from("profiles").select("total_xp, level, imported_at, frontend_xp, backend_xp, fullstack_xp, tester_xp").single(),
      supabase.from("missions").select("id, xp, prerequisite_ids").order("sort_order"),
      supabase.from("mission_attempts").select("mission_id, answer, reflection, completed_at, awarded_xp, repository_url, demo_url, test_result, ai_feedback, html_code, css_code, javascript_code").order("completed_at", { ascending: false }),
    ]);
    if (profileError || missionError || attemptError) throw new Error(profileError?.message ?? missionError?.message ?? attemptError?.message ?? "Unable to load progress.");
    const profileRow = profileData as ProfileRow;
    setProfile({ totalXp: profileRow.total_xp, level: profileRow.level, importedAt: profileRow.imported_at, frontendXp: profileRow.frontend_xp, backendXp: profileRow.backend_xp, fullstackXp: profileRow.fullstack_xp, testerXp: profileRow.tester_xp });
    setMissions((missionData as MissionRow[]).map(fromMissionRow));
    setAttempts((attemptData as AttemptRow[]).map(fromAttemptRow));
    setSelectedMissionId((missionData as MissionRow[])[0]?.id ?? "");
    setLegacyAttempts(readLegacyAttempts());
  };

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("engineer-quest-theme") as "dark" | "light" | null;
    const initialTheme = savedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = initialTheme;
    queueMicrotask(() => setTheme(initialTheme));
    if (!isSupabaseConfigured) return;
    createSupabaseBrowserClient().auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) { setStatus(""); return; }
      setUserEmail(data.user.email ?? "Signed-in learner");
      try { await loadProgress(); setStatus(""); } catch (loadError) { setStatus(loadError instanceof Error ? loadError.message : "Unable to load progress."); }
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); window.localStorage.setItem("engineer-quest-theme", next); document.documentElement.dataset.theme = next;
  };
  const completedIds = useMemo(() => new Set(attempts.map((attempt) => attempt.missionId)), [attempts]);
  const hasRecommendedPreparation = (mission: Mission) => mission.prerequisites.every((id) => completedIds.has(id));
  const activeMissions = missions.filter((mission) => mission.track === track);
  const visibleMissions = activeMissions.filter((mission) => (typeFilter === "all" || mission.type === typeFilter) && `${mission.title} ${mission.summary}`.toLowerCase().includes(challengeQuery.trim().toLowerCase()));
  const selectedMission = missions.find((mission) => mission.id === selectedMissionId) ?? activeMissions[0];
  const selectedAttempt = attempts.find((attempt) => attempt.missionId === selectedMission?.id);
  const recommended = activeMissions.find((mission) => !completedIds.has(mission.id) && hasRecommendedPreparation(mission)) ?? missions.find((mission) => !completedIds.has(mission.id) && hasRecommendedPreparation(mission)) ?? activeMissions.find((mission) => !completedIds.has(mission.id));
  const currentLevel = profile ? levelData(profile.level) : levels[0];
  const progressPercent = profile && currentLevel.next ? Math.min(100, ((profile.totalXp - currentLevel.minimum) / (currentLevel.next - currentLevel.minimum)) * 100) : 100;

  useEffect(() => {
    if (!selectedMission || selectedMission.type !== "build") return;
    const timer = window.setTimeout(() => {
      setPreviewCode({ html: htmlCode, css: cssCode, javascript: javascriptCode });
      localStorage.setItem(draftKey(selectedMission.id), JSON.stringify({ html: htmlCode, css: cssCode, javascript: javascriptCode }));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [selectedMission, htmlCode, cssCode, javascriptCode]);

  const sendMagicLink = async (event: FormEvent) => { event.preventDefault(); setAuthMessage(""); const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } }); setAuthMessage(error ? error.message : "Magic link sent. Check your inbox to continue."); };
  const signOut = async () => { await createSupabaseBrowserClient().auth.signOut(); setUserEmail(null); setProfile(null); setMissions([]); setAttempts([]); setStatus(""); };
  const chooseMission = (mission: Mission) => {
    setSelectedMissionId(mission.id);
    setAnswer("");
    setReflection("");
    setRepositoryUrl(""); setDemoUrl(""); setTestResult(""); setAiFeedback("");
    const draft = readCodeDraft(mission.id);
    const nextCode = draft ?? { html: "<main>\n  <h1>My challenge</h1>\n</main>", css: "", javascript: "// Write your JavaScript here\n" };
    setHtmlCode(nextCode.html); setCssCode(nextCode.css); setJavascriptCode(nextCode.javascript); setPreviewCode(nextCode); setEditorTab("html");
    setCelebration(null);
    window.requestAnimationFrame(() => document.getElementById("mission-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const selectTrack = (nextTrack: TrackId) => { setTrack(nextTrack); setChallengeQuery(""); setTypeFilter("all"); const first = missions.find((mission) => mission.track === nextTrack && !completedIds.has(mission.id) && hasRecommendedPreparation(mission)) ?? missions.find((mission) => mission.track === nextTrack); if (first) chooseMission(first); };
  const copyPrompt = async () => { if (!selectedMission) return; await navigator.clipboard.writeText(`You are a senior ${selectedMission.track} engineering reviewer.\n\nMission: ${selectedMission.title}\n${selectedMission.prompt}\n\nMy answer:\n${answer || "[Paste my answer here]"}\n\nReview against this rubric:\n${selectedMission.rubric.map((item) => `- ${item}`).join("\n")}\n\nDo not give a replacement solution first. Ask up to three questions that help me discover gaps, then give feedback as blocker, important, or suggestion.`); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const completeMission = async () => {
    if (!selectedMission || !answer.trim() || !reflection.trim() || !profile) return;
    setSubmitting(true); setStatus("");
    const rpc = selectedMission.type === "build" ? "submit_code_challenge" : "submit_challenge";
    const params = selectedMission.type === "build" ? { p_mission_id: selectedMission.id, p_answer: answer.trim(), p_reflection: reflection.trim(), p_html_code: htmlCode.trim(), p_css_code: cssCode.trim() || null, p_javascript_code: javascriptCode.trim(), p_ai_feedback: aiFeedback.trim() || null } : { p_mission_id: selectedMission.id, p_answer: answer.trim(), p_reflection: reflection.trim(), p_repository_url: repositoryUrl.trim() || null, p_demo_url: demoUrl.trim() || null, p_test_result: testResult.trim() || null, p_ai_feedback: aiFeedback.trim() || null };
    const { data, error } = await createSupabaseBrowserClient().rpc(rpc, params);
    setSubmitting(false); if (error) { setStatus(error.message); return; }
    const result = Array.isArray(data) ? data[0] : data;
    setAttempts((current) => [...current, { missionId: selectedMission.id, answer: answer.trim(), reflection: reflection.trim(), completedAt: result.completed_at, awardedXp: result.awarded_xp, repositoryUrl: repositoryUrl.trim() || null, demoUrl: demoUrl.trim() || null, testResult: testResult.trim() || null, aiFeedback: aiFeedback.trim() || null, htmlCode: selectedMission.type === "build" ? htmlCode.trim() : null, cssCode: selectedMission.type === "build" ? cssCode.trim() || null : null, javascriptCode: selectedMission.type === "build" ? javascriptCode.trim() : null }]);
    setProfile({ ...profile, totalXp: result.total_xp, level: result.level }); setCelebration({ mission: selectedMission, earnedXp: result.awarded_xp, promoted: profile.level !== result.level }); setAnswer(""); setReflection("");
    if (selectedMission.type === "build") localStorage.removeItem(draftKey(selectedMission.id));
  };
  const importLegacy = async () => { setImporting(true); let imported = 0; const supabase = createSupabaseBrowserClient(); for (const attempt of legacyAttempts) { const { error } = await supabase.rpc("complete_mission", { p_mission_id: attempt.missionId, p_answer: attempt.answer, p_reflection: attempt.reflection }); if (!error) imported += 1; } const { error } = await supabase.rpc("mark_legacy_imported"); if (error) setStatus(error.message); else { setLegacyAttempts([]); setStatus(`${imported} evidence entr${imported === 1 ? "y" : "ies"} imported.`); await loadProgress(); } setImporting(false); };

  if (!isSupabaseConfigured) return <main className="app-shell"><SetupPanel /></main>;
  const callbackError = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("authError");
  if (!userEmail) return <main className="auth-page"><ThemeButton theme={theme} onClick={toggleTheme} /><section className="auth-intro"><p className="brand"><Zap size={18} /> Engineer Quest</p><p className="eyebrow">YOUR ENGINEERING PRACTICE SYSTEM</p><h1>Make your judgment visible.</h1><p>Build evidence through real engineering challenges. Your XP, level, and written work follow you everywhere.</p><div className="auth-benefits"><span><Check /> Curated challenge paths</span><span><Check /> Private evidence portfolio</span><span><Check /> Cloud-saved progression</span></div></section><form className="auth-card" onSubmit={sendMagicLink}><p className="eyebrow">ENTER THE WORKSPACE</p><h2>Continue your quest</h2><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label><button className="button primary-button" type="submit"><Send size={17} /> Send magic link</button>{(authMessage || callbackError) && <p className="notice" role="status">{authMessage || callbackError}</p>}<small>No password required. We’ll email a secure sign-in link.</small></form></main>;
  if (!profile) return <main className="app-shell"><LoadingPanel message={status || "Preparing your workspace…"} /></main>;

  return <main className="app-shell"><header className="topbar"><a className="brand" href="#top"><Zap size={18} /> Engineer Quest</a><div className="topbar-actions"><span className="identity">{userEmail}</span><ThemeButton theme={theme} onClick={toggleTheme} /><button className="icon-button" aria-label="Sign out" onClick={signOut}><LogOut size={18} /></button></div></header><div id="top" className={`dashboard track-${track}`}>
    <section className="command-center"><div className="command-copy"><p className="eyebrow">{tracks.find((item) => item.id === track)?.label.toUpperCase()} PATH · {profile.level.toUpperCase()} ENGINEER</p><h1>{recommended ? "Your next challenge is ready." : "Every challenge is complete."}</h1><p>{recommended ? `${recommended.title} is the recommended next step in your ${tracks.find((item) => item.id === recommended.track)?.label ?? ""} path.` : "You have completed the full Engineer Quest curriculum."}</p>{recommended && <button className="button primary-button" onClick={() => { setTrack(recommended.track); chooseMission(recommended); }}><Target size={18} /> Start next challenge <ChevronRight size={17} /></button>}</div><div className="rank-card"><div className="rank-icon"><Trophy size={26} /></div><span>Overall rank</span><strong>{profile.level}</strong><div className="xp-track" aria-label={`${Math.round(progressPercent)} percent to next rank`}><i style={{ width: `${progressPercent}%` }} /></div><small>{currentLevel.next ? `${currentLevel.next - profile.totalXp} XP to ${levels[levels.indexOf(currentLevel) + 1].name}` : "Mastery achieved"}</small></div></section>
    {!profile.importedAt && legacyAttempts.length > 0 && <section className="import-banner"><div><span className="mini-icon"><Clipboard size={18} /></span><div><strong>Bring your earlier work with you</strong><p>Import {legacyAttempts.length} browser-saved evidence entr{legacyAttempts.length === 1 ? "y" : "ies"} to this account.</p></div></div><button className="button secondary-button" onClick={importLegacy} disabled={importing}>{importing ? "Importing…" : "Import evidence"}</button></section>}
    {status && <p className="notice status-notice" role="status"><CircleAlert size={16} /> {status}</p>}
    <section className="progress-grid" aria-label="Track progress"><Metric icon={<Zap />} label="Frontend XP" value={`${profile.frontendXp} XP`} /><Metric icon={<Zap />} label="Backend XP" value={`${profile.backendXp} XP`} /><Metric icon={<Zap />} label="Full-stack XP" value={`${profile.fullstackXp} XP`} /><Metric icon={<Zap />} label="Tester XP" value={`${profile.testerXp} XP`} /></section>
    <section className="track-tabs" aria-label="Engineering tracks">{tracks.map((item) => { const done = missions.filter((mission) => mission.track === item.id && completedIds.has(mission.id)).length; const total = missions.filter((mission) => mission.track === item.id).length; return <button className={track === item.id ? "track-tab active" : "track-tab"} key={item.id} onClick={() => selectTrack(item.id)}><span>{item.label}</span><small>{done}/{total} complete</small></button>; })}</section>
    <section className="challenge-library" aria-label="Challenge library"><div><p className="eyebrow">CHALLENGE LIBRARY</p><h2>Pick the work that matters now.</h2><p>Every challenge is available. Prerequisites are recommendations, not gates.</p></div><div className="library-controls"><input aria-label="Search challenges" value={challengeQuery} onChange={(event) => setChallengeQuery(event.target.value)} placeholder="Search challenges" /><select aria-label="Filter challenge type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | Mission["type"])}><option value="all">All formats</option><option value="build">Code builds</option><option value="diagnose">Debugging</option><option value="design">Design</option><option value="review">Reviews</option></select></div></section>
    <section className="workspace"><aside className="roadmap"><div className="section-heading"><div><p className="eyebrow">YOUR PATH</p><h2>{tracks.find((item) => item.id === track)?.label}</h2></div><span>{activeMissions.filter((mission) => completedIds.has(mission.id)).length}/{activeMissions.length}</span></div><div className="mission-map">{visibleMissions.map((mission, index) => { const complete = completedIds.has(mission.id); const needsPreparation = !hasRecommendedPreparation(mission); return <button className={`mission-node ${selectedMission?.id === mission.id ? "selected" : ""} ${complete ? "complete" : ""}`} key={mission.id} onClick={() => chooseMission(mission)}><span className="node-status">{complete ? <Check size={14} /> : needsPreparation ? <LockKeyhole size={13} /> : index + 1}</span><span><small>{mission.level} · {mission.type} · {mission.xp} XP</small><strong>{mission.title}</strong>{needsPreparation && <em>Prep recommended first</em>}</span></button>; })}{visibleMissions.length === 0 && <p className="empty-library">No challenges match these filters.</p>}</div></aside>
      {selectedMission && <article className="mission-workspace" id="mission-workspace">{celebration?.mission.id === selectedMission.id ? <CompletionPanel celebration={celebration} next={recommended} onNext={() => recommended && chooseMission(recommended)} /> : <><header className="mission-header"><div><p className="eyebrow">{selectedMission.level} · {selectedMission.type === "build" ? "CODE CHALLENGE" : selectedMission.type}</p><h2>{selectedMission.title}</h2><p>{selectedMission.summary}</p></div><span className="xp-pill"><Zap size={15} /> {selectedMission.xp} XP</span></header><div className="brief-grid"><section className="mission-brief"><h3>Challenge brief</h3><p>{selectedMission.prompt}</p>{selectedMission.type === "build" && <div className="code-callout"><strong>Build in the browser</strong><p>Use HTML and JavaScript below. Both are required; CSS is optional. Your preview runs in a sandbox.</p></div>}<div className="rubric"><h3>What good looks like</h3><ul>{selectedMission.rubric.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul></div></section><section className="response-panel">{selectedAttempt ? <div className="saved-evidence"><p className="eyebrow"><Check size={14} /> EVIDENCE SAVED</p><h3>Your submitted thinking</h3>{selectedAttempt.htmlCode && <section className="saved-code"><div className="preview-heading"><span>Your submitted live preview</span><small>Sandboxed</small></div><iframe title="Submitted challenge code preview" className="code-preview" sandbox="allow-scripts" srcDoc={previewDocument(selectedAttempt.htmlCode, selectedAttempt.cssCode ?? "", selectedAttempt.javascriptCode ?? "")} /><details><summary>View submitted source</summary><h4>HTML</h4><pre>{selectedAttempt.htmlCode}</pre>{selectedAttempt.cssCode && <><h4>CSS</h4><pre>{selectedAttempt.cssCode}</pre></>}{selectedAttempt.javascriptCode && <><h4>JavaScript</h4><pre>{selectedAttempt.javascriptCode}</pre></>}</details></section>}{selectedAttempt.repositoryUrl && <p><a href={selectedAttempt.repositoryUrl} target="_blank" rel="noreferrer">Open submitted repository / PR</a></p>}{selectedAttempt.demoUrl && <p><a href={selectedAttempt.demoUrl} target="_blank" rel="noreferrer">Open live demo</a></p>}{selectedAttempt.testResult && <div><strong>Test result</strong><p>{selectedAttempt.testResult}</p></div>}<p>{selectedAttempt.answer}</p><div><strong>Self-review</strong><p>{selectedAttempt.reflection}</p></div>{selectedAttempt.aiFeedback && <div><strong>AI feedback captured</strong><p>{selectedAttempt.aiFeedback}</p></div>}<small>Completed {new Date(selectedAttempt.completedAt).toLocaleDateString()}</small></div> : <><label>Your response <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={selectedMission.type === "build" ? "Briefly explain the implementation decisions and trade-offs…" : "Explain the reasoning, decisions, and trade-offs behind your approach…"} rows={8} /><small>{answer.trim().length} characters · Explain the engineering judgment behind your work.</small></label>{selectedMission.type === "build" && <section className="code-workbench"><div className="editor-tabs"><button className={editorTab === "html" ? "active" : ""} onClick={() => setEditorTab("html")}>HTML *</button><button className={editorTab === "css" ? "active" : ""} onClick={() => setEditorTab("css")}>CSS</button><button className={editorTab === "javascript" ? "active" : ""} onClick={() => setEditorTab("javascript")}>JavaScript *</button></div><CodeEditor value={editorTab === "html" ? htmlCode : editorTab === "css" ? cssCode : javascriptCode} language={editorTab === "javascript" ? "js" : editorTab} placeholder={`Write ${editorTab}…`} onChange={(event) => { if (editorTab === "html") setHtmlCode(event.target.value); else if (editorTab === "css") setCssCode(event.target.value); else setJavascriptCode(event.target.value); }} padding={14} style={{ backgroundColor: "var(--bg)", color: "var(--text)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, minHeight: 230 }} /><div className="preview-heading"><span>Live preview</span><small>Updates after you pause · draft saved locally</small></div><iframe title="Challenge code preview" className="code-preview" sandbox="allow-scripts" srcDoc={previewDocument(previewCode.html, previewCode.css, previewCode.javascript)} /></section>}<section className="ai-review"><div><p className="eyebrow">OPTIONAL AI REVIEW</p><h3>Ask an AI to challenge your work.</h3><p>Copy the structured review prompt, open any AI tool you use, then save the feedback that helped.</p></div><div className="ai-actions"><button className="button text-button" onClick={copyPrompt}><Clipboard size={16} /> {copied ? "Prompt copied" : "Copy review prompt"}</button><button className="button text-button" onClick={() => window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer")}>Open AI reviewer <ChevronRight size={16} /></button></div><label>Useful AI feedback <textarea value={aiFeedback} onChange={(event) => setAiFeedback(event.target.value)} placeholder="Optional: paste feedback you verified and want to remember." rows={3} /></label></section><label>Self-review <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What would you improve for production? What did you learn?" rows={4} /><small>{reflection.trim().length} characters · Required to earn XP.</small></label><div className="editor-actions"><button className="button primary-button" disabled={submitting || !answer.trim() || !reflection.trim() || (selectedMission.type === "build" && (!htmlCode.trim() || !javascriptCode.trim()))} onClick={completeMission}>{submitting ? "Saving evidence…" : <><Zap size={17} /> Submit challenge + earn XP</>}</button></div></>}</section></div></>}</article>}</section>
    <section className="principle"><Sparkles size={19} /><div><p className="eyebrow">THE AI RULE</p><p>Use AI to challenge your reasoning, not replace it. You should be able to explain every decision you save here.</p></div></section>
  </div></main>;
}

function ThemeButton({ theme, onClick }: { theme: "dark" | "light"; onClick: () => void }) { return <button className="icon-button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={onClick}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function LoadingPanel({ message }: { message: string }) { return <section className="state-panel"><span className="loading-orb" /><p className="eyebrow">ENGINEER QUEST</p><h1>{message}</h1><p>Loading your saved practice history and current path.</p></section>; }
function SetupPanel() { return <section className="state-panel"><span className="mini-icon"><CircleAlert size={22} /></span><p className="eyebrow">SETUP REQUIRED</p><h1>Connect your quest workspace.</h1><p>Add the public Supabase values to <code>.env.local</code>, then run the supplied migration to enable secure accounts and progress.</p></section>; }
function CompletionPanel({ celebration, next, onNext }: { celebration: Exclude<Celebration, null>; next?: Mission; onNext: () => void }) { return <section className="completion-panel"><span className="completion-icon"><Trophy size={32} /></span><p className="eyebrow">EVIDENCE SAVED</p><h2>Challenge complete.</h2><p>You earned <strong>{celebration.earnedXp} XP</strong> for {celebration.mission.title}.{celebration.promoted ? " You reached a new engineering rank." : ""}</p>{next && <button className="button primary-button" onClick={onNext}>Continue to {next.title} <ChevronRight size={17} /></button>}</section>; }
