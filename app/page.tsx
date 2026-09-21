"use client";
/* eslint-disable @next/next/no-img-element -- A foto é um WebP local já otimizado e carregado sob demanda. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, BookOpen, CalendarDays, Check, ChefHat, Clock3, Database, Download, Dumbbell, HeartPulse, LayoutDashboard, Menu, MessageCircle, Plus, RotateCcw, Search, Send, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, Upload, Utensils, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Progress } from "@/components/ui/progress";
import { backupSchema, parseBackup, type Entry, type FastSession, type FreeMeal, type PulsoBackup, type PulsoData } from "@/lib/pulso-backup";
import { buildMealPlan, type Avoid, type DietStyle } from "@/lib/meal-planner";

type Section = "visao" | "imc" | "treinos" | "alimentacao" | "jejum" | "flexivel" | "evolucao" | "coach" | "dados";
type Chat = { role: "user" | "assistant"; text: string; local?: boolean };
const nav: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: "visao", label: "Visão geral", icon: LayoutDashboard }, { id: "imc", label: "Meu IMC", icon: Activity },
  { id: "treinos", label: "Treinos", icon: Dumbbell }, { id: "alimentacao", label: "Alimentação", icon: ChefHat },
  { id: "jejum", label: "Jejum", icon: Clock3 }, { id: "flexivel", label: "Refeição livre", icon: Utensils },
  { id: "evolucao", label: "Evolução", icon: TrendingUp }, { id: "coach", label: "Assistente", icon: MessageCircle },
  { id: "dados", label: "Meus dados", icon: ShieldCheck },
];
const today = () => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const readJson = (key: string): unknown => { try { const text = localStorage.getItem(key); return text ? JSON.parse(text) : null; } catch { return null; } };

function Choice<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  return <RadioGroup className="choices" value={value} onValueChange={v => onChange(v as T)} aria-label={label}>{options.map(o => <label key={o.value} className={`choice ${value === o.value ? "selected" : ""}`}><RadioGroupItem value={o.value} className="choice-radio"/><span>{o.label}</span></label>)}</RadioGroup>;
}

function PageTitle({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return <div className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>;
}

function ToolCard({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`tool-card ${className}`}>{children}</div>; }

function generateWorkout(days: number, level: string, place: string, favorite: string, goal: string, duration: number, equipment: string) {
  const gym = { upper: ["Supino com halteres", "Remada baixa", "Desenvolvimento de ombros", "Puxada frontal", "Rosca bíceps", "Tríceps na polia"], lower: ["Agachamento guiado", "Leg press", "Cadeira extensora", "Mesa flexora", "Elevação pélvica", "Panturrilha em pé"], full: ["Agachamento", "Supino com halteres", "Remada baixa", "Terra romeno", "Desenvolvimento de ombros", "Prancha"] };
  const bodyweight = { upper: ["Flexão inclinada", "Remada com mochila", "Prancha", "Flexão na parede", "Prancha lateral", "Superman"], lower: ["Agachamento livre", "Avanço alternado", "Ponte de glúteos", "Agachamento sumô", "Elevação de panturrilha", "Prancha lateral"], full: ["Agachamento livre", "Flexão inclinada", "Remada com mochila", "Avanço alternado", "Ponte de glúteos", "Prancha"] };
  const basic = { upper: ["Supino no chão com halteres", "Remada unilateral com halter", "Desenvolvimento com halteres", "Elevação lateral", "Rosca com halteres", "Prancha"], lower: ["Agachamento com halter", "Terra romeno com halteres", "Avanço alternado", "Ponte de glúteos", "Elevação de panturrilha", "Prancha lateral"], full: ["Agachamento com halter", "Supino no chão com halteres", "Remada unilateral com halter", "Terra romeno com halteres", "Desenvolvimento com halteres", "Prancha"] };
  const source = place === "academia" ? gym : equipment === "basico" ? basic : bodyweight;
  const order = days === 2 ? ["full", "full"] : favorite === "pernas" ? ["lower", "upper", "lower", "full", "upper"] : favorite === "superiores" ? ["upper", "lower", "upper", "full", "lower"] : ["full", "upper", "lower", "upper", "lower"];
  const names: Record<string,string> = { upper: "Parte superior", lower: "Pernas e glúteos", full: "Corpo todo" };
  const exerciseCount = duration <= 20 ? 3 : duration <= 40 ? 4 : 5;
  const series = level === "iniciante" || goal === "bem-estar" ? "2 séries de 8–12 repetições" : goal === "forca" ? "3 séries de 6–10 repetições" : "3 séries de 8–12 repetições";
  return order.slice(0, days).map((kind, index) => ({ title: `Dia ${index + 1} · ${names[kind]}`, exercises: source[kind as keyof typeof source].slice(0, exerciseCount), series }));
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<Section>("visao");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [days, setDays] = useState(3);
  const [level, setLevel] = useState("iniciante");
  const [place, setPlace] = useState("academia");
  const [favorite, setFavorite] = useState("equilibrado");
  const [goal, setGoal] = useState<"bem-estar" | "forca" | "massa">("bem-estar");
  const [duration, setDuration] = useState(40);
  const [equipment, setEquipment] = useState<"corpo" | "basico">("corpo");
  const [workoutReady, setWorkoutReady] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [diet, setDiet] = useState<DietStyle>("onivora");
  const [meals, setMeals] = useState(4);
  const [menuVariant, setMenuVariant] = useState(0);
  const [avoid, setAvoid] = useState<Avoid[]>([]);
  const [fastHours, setFastHours] = useState(12);
  const [fastStart, setFastStart] = useState<number | null>(null);
  const [fastHistory, setFastHistory] = useState<FastSession[]>([]);
  const [now, setNow] = useState(0);
  const [freeDate, setFreeDate] = useState(today());
  const [freeType, setFreeType] = useState<FreeMeal["meal"]>("Almoço");
  const [freeNote, setFreeNote] = useState("");
  const [freeFrequency, setFreeFrequency] = useState(1);
  const [freeMeals, setFreeMeals] = useState<FreeMeal[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entryWeight, setEntryWeight] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryEnergy, setEntryEnergy] = useState(3);
  const [prompt, setPrompt] = useState("");
  const [chat, setChat] = useState<Chat[]>([{ role: "assistant", text: "Olá! Posso ajudar você a organizar seus próximos passos. Como está sua rotina hoje?", local: true }]);
  const [busy, setBusy] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [dataNotice, setDataNotice] = useState("");
  const [pendingImport, setPendingImport] = useState<PulsoBackup | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
    try {
      const dataShape = backupSchema.shape.data.shape;
      const e = dataShape.entries.safeParse(readJson("pulso.entries")); if (e.success) setEntries(e.data);
      const f = dataShape.freeMeals.safeParse(readJson("pulso.freeMeals")); if (f.success) setFreeMeals(f.data);
      const c = dataShape.completed.safeParse(readJson("pulso.completed")); if (c.success) setCompleted(c.data);
      const history = dataShape.fastHistory.safeParse(readJson("pulso.fastHistory")); if (history.success) setFastHistory(history.data);
      const s = Number(localStorage.getItem("pulso.fastStart")); if (Number.isInteger(s) && s > 0) setFastStart(s);
      const consent = localStorage.getItem("pulso.aiConsent"); if (consent === "true") setAiConsent(true);
      const parsedProfile = dataShape.profile.partial().safeParse(readJson("pulso.profile"));
      if (parsedProfile.success) {
        const saved = parsedProfile.data;
        if (saved.height !== undefined) setHeight(saved.height);
        if (saved.weight !== undefined) setWeight(saved.weight);
        if (saved.days !== undefined) setDays(saved.days);
        if (saved.level !== undefined) setLevel(saved.level);
        if (saved.place !== undefined) setPlace(saved.place);
        if (saved.favorite !== undefined) setFavorite(saved.favorite);
        if (saved.goal !== undefined) setGoal(saved.goal);
        if (saved.duration !== undefined) setDuration(saved.duration);
        if (saved.equipment !== undefined) setEquipment(saved.equipment);
        if (saved.diet !== undefined) setDiet(saved.diet);
        if (saved.meals !== undefined) setMeals(saved.meals);
        if (saved.menuVariant !== undefined) setMenuVariant(saved.menuVariant);
        if (saved.avoid !== undefined) setAvoid(saved.avoid);
        if (saved.freeFrequency !== undefined) setFreeFrequency(saved.freeFrequency);
        if (saved.fastHours !== undefined) setFastHours(saved.fastHours);
        setWorkoutReady(Boolean(saved.workoutReady));
      }
    } catch { /* storage may be unavailable */ }
    setHydrated(true);
    });
  }, []);
  useEffect(() => { queueMicrotask(() => setNow(Date.now())); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { fetch("/api/coach", { cache: "no-store" }).then(response => response.json()).then(data => setAiAvailable(Boolean((data as { online?: boolean }).online))).catch(() => setAiAvailable(false)); }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(value => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => { if (hydrated) try { localStorage.setItem("pulso.entries", JSON.stringify(entries)); } catch {} }, [entries, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem("pulso.freeMeals", JSON.stringify(freeMeals)); } catch {} }, [freeMeals, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem("pulso.completed", JSON.stringify(completed)); } catch {} }, [completed, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem("pulso.fastHistory", JSON.stringify(fastHistory)); } catch {} }, [fastHistory, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem("pulso.aiConsent", String(aiConsent)); } catch {} }, [aiConsent, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem("pulso.profile", JSON.stringify({ height, weight, days, level, place, favorite, goal, duration, equipment, workoutReady, diet, meals, menuVariant, avoid, freeFrequency, fastHours })); } catch {} }, [height, weight, days, level, place, favorite, goal, duration, equipment, workoutReady, diet, meals, menuVariant, avoid, freeFrequency, fastHours, hydrated]);

  const bmi = weight > 0 && height > 0 ? weight / Math.pow(height / 100, 2) : NaN;
  const validBmi = Number.isFinite(bmi) && height >= 100 && height <= 230 && weight >= 25 && weight <= 350;
  const bmiMarker = validBmi ? Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100)) : 0;
  const category = bmi < 18.5 ? "Abaixo do peso" : bmi < 25 ? "Faixa habitual" : bmi < 30 ? "Sobrepeso" : "Obesidade";
  const workouts = useMemo(() => generateWorkout(days, level, place, favorite, goal, duration, equipment), [days, level, place, favorite, goal, duration, equipment]);
  const elapsed = fastStart ? Math.min(Math.max(0, (now - fastStart) / 3600000), fastHours) : 0;
  const remaining = Math.max(0, fastHours * 3600000 - (fastStart ? now - fastStart : 0));
  const remainingText = `${String(Math.floor(remaining / 3600000)).padStart(2,"0")}:${String(Math.floor((remaining % 3600000) / 60000)).padStart(2,"0")}`;
  const selectedMeals = useMemo(() => buildMealPlan(diet, meals, menuVariant, avoid), [diet, meals, menuVariant, avoid]);
  const weekStart = new Date(`${today()}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const plannedThisWeek = freeMeals.filter(meal => { const date = new Date(`${meal.date}T12:00:00`); return date >= weekStart && date < weekEnd; }).length;
  const weightChange = entries.length >= 2 ? entries.at(-1)!.weight - entries[0].weight : null;
  const latestEnergy = entries.at(-1)?.energy;
  function go(id: Section) { setSection(id); setMenuOpen(false); setSearchOpen(false); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  function addEntry(e: React.FormEvent) { e.preventDefault(); const n = Number(entryWeight.replace(",",".")); if (!Number.isFinite(n) || n < 25 || n > 350) return; setEntries(old => [...old.filter(x => x.date !== today()), { date: today(), weight: n, note: entryNote.trim(), energy: entryEnergy }].sort((a,b)=>a.date.localeCompare(b.date))); setEntryWeight(""); setEntryNote(""); }
  function addFreeMeal(e: React.FormEvent) { e.preventDefault(); if (!freeDate) return; setFreeMeals(old => [...old, { date: freeDate, meal: freeType, note: freeNote.trim() }].sort((a,b)=>a.date.localeCompare(b.date))); setFreeNote(""); }
  function startFast() { const t = Date.now(); setFastStart(t); try { localStorage.setItem("pulso.fastStart", String(t)); } catch {} }
  function stopFast() { if (fastStart) setFastHistory(old => [{ start: fastStart, end: Date.now(), hours: fastHours }, ...old].slice(0, 1000)); setFastStart(null); try { localStorage.removeItem("pulso.fastStart"); } catch {} }
  function snapshotData(): PulsoData { return { profile: { height, weight, days, level: level as PulsoData["profile"]["level"], place: place as PulsoData["profile"]["place"], favorite: favorite as PulsoData["profile"]["favorite"], workoutReady, goal, duration, equipment, diet, meals, menuVariant, avoid, freeFrequency, fastHours }, completed, entries, freeMeals, fastHistory, fastStart }; }
  function exportData() {
    try {
      const backup: PulsoBackup = { version: 1, exportedAt: new Date().toISOString(), data: snapshotData() };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `pulso-backup-${today()}.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDataNotice("Backup criado. Guarde o arquivo em um lugar seguro.");
    } catch { setDataNotice("Não foi possível criar o backup neste navegador."); }
  }
  async function chooseImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { if (file.size > 5_000_000) throw new Error("O arquivo excede o limite de 5 MB."); setPendingImport(parseBackup(await file.text())); setDataNotice(""); }
    catch (error) { setPendingImport(null); setDataNotice(error instanceof Error ? error.message : "Não foi possível ler o arquivo."); }
    event.target.value = "";
  }
  function applyImport() {
    if (!pendingImport) return;
    const data = pendingImport.data;
    setHeight(data.profile.height); setWeight(data.profile.weight); setDays(data.profile.days); setLevel(data.profile.level); setPlace(data.profile.place); setFavorite(data.profile.favorite);
    setGoal(data.profile.goal); setDuration(data.profile.duration); setEquipment(data.profile.equipment); setWorkoutReady(data.profile.workoutReady);
    setDiet(data.profile.diet); setMeals(data.profile.meals); setMenuVariant(data.profile.menuVariant); setAvoid(data.profile.avoid);
    setFreeFrequency(data.profile.freeFrequency); setFastHours(data.profile.fastHours); setCompleted(data.completed.filter(index => index < data.profile.days));
    setEntries(data.entries); setFreeMeals(data.freeMeals); setFastHistory(data.fastHistory); setFastStart(data.fastStart);
    try { if (data.fastStart) localStorage.setItem("pulso.fastStart", String(data.fastStart)); else localStorage.removeItem("pulso.fastStart"); } catch {}
    setAiConsent(false); setPendingImport(null); setDataNotice("Backup restaurado. A IA online permanece desligada até você escolher ativá-la.");
  }
  function eraseData() {
    try { for (const key of ["pulso.entries", "pulso.freeMeals", "pulso.fastStart", "pulso.completed", "pulso.fastHistory", "pulso.profile", "pulso.aiConsent"]) localStorage.removeItem(key); } catch {}
    window.location.reload();
  }
  async function askCoach(e: React.FormEvent) {
    e.preventDefault(); const question = prompt.trim(); if (!question || busy) return;
    setChat(old => [...old, { role: "user", text: question }]); setPrompt(""); setBusy(true);
    try {
      if (!aiAvailable || !aiConsent) throw new Error("local");
      const response = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, context: { entryCount: entries.length, weightTrendKg: weightChange, energy: latestEnergy ?? null, completed: completed.length, days, goal, diet } }) });
      if (!response.ok) throw new Error("local");
      const data = await response.json() as { answer?: string }; if (!data.answer) throw new Error("empty"); setChat(old => [...old, { role: "assistant", text: data.answer! }]);
    } catch {
      const q = question.toLowerCase();
      const answer = q.includes("trein") ? `Você escolheu ${days} dias de treino por semana. Comece pelo plano em Treinos, priorize a técnica e ajuste a carga de forma gradual.` : q.includes("com") || q.includes("diet") || q.includes("aliment") ? "Monte refeições variadas com legumes, fontes de proteína, grãos e alimentos que você gosta. Veja sugestões na área Alimentação; para necessidades específicas, procure um nutricionista." : q.includes("jejum") ? "Jejum não é necessário para ter uma rotina saudável. Se quiser experimentar, considere sua saúde, sua relação com a comida e converse com um profissional se tiver dúvidas." : entries.length > 1 ? `Você já registrou ${entries.length} medidas. Observe tendências ao longo do tempo, junto com energia, força e bem-estar, sem se prender a um único número.` : "Comece por uma meta pequena e sustentável: planeje seus treinos da semana, inclua variedade nas refeições e registre como se sente. Posso ajudar com treino, alimentação ou hábitos.";
      setChat(old => [...old, { role: "assistant", text: answer, local: true }]);
    } finally { setBusy(false); }
  }

  function renderWorkout() {
    return <>
      <PageTitle eyebrow="MOVIMENTO DO SEU JEITO" title="Monte seu treino." intro="Ajuste sua semana ao tempo, ao lugar e ao tipo de movimento de que você gosta."/>
      <div className="two-column">
        <ToolCard>
          <h2>Suas preferências</h2>
          <div className="control-group"><span className="control-label">Dias por semana</span><Choice label="Dias por semana" options={[2,3,4,5].map(x=>({value:String(x),label:`${x} dias`}))} value={String(days)} onChange={v=>{setDays(Number(v));setWorkoutReady(false);setCompleted([])}}/></div>
          <div className="control-group"><span className="control-label">Objetivo principal</span><Choice label="Objetivo do treino" options={[{value:"bem-estar",label:"Bem-estar"},{value:"forca",label:"Força"},{value:"massa",label:"Ganhar massa"}]} value={goal} onChange={v=>{setGoal(v as typeof goal);setWorkoutReady(false);setCompleted([])}}/></div>
          <div className="control-group"><span className="control-label">Tempo disponível por treino</span><Choice label="Tempo por treino" options={[20,40,60].map(x=>({value:String(x),label:`${x} min`}))} value={String(duration)} onChange={v=>{setDuration(Number(v));setWorkoutReady(false);setCompleted([])}}/></div>
          <div className="control-group"><span className="control-label">Experiência</span><Choice label="Experiência" options={[{value:"iniciante",label:"Começando"},{value:"intermediario",label:"Já treino"}]} value={level} onChange={v=>{setLevel(v);setWorkoutReady(false);setCompleted([])}}/></div>
          <div className="control-group"><span className="control-label">Onde vai treinar?</span><Choice label="Onde vai treinar" options={[{value:"academia",label:"Academia"},{value:"casa",label:"Em casa"}]} value={place} onChange={v=>{setPlace(v);setWorkoutReady(false);setCompleted([])}}/></div>
          {place === "casa" && <div className="control-group"><span className="control-label">Equipamento em casa</span><Choice label="Equipamento em casa" options={[{value:"corpo",label:"Peso corporal"},{value:"basico",label:"Halteres"}]} value={equipment} onChange={v=>{setEquipment(v as typeof equipment);setWorkoutReady(false);setCompleted([])}}/></div>}
          <div className="control-group"><span className="control-label">O que você mais gosta?</span><Choice label="Preferência de treino" options={[{value:"equilibrado",label:"Variar"},{value:"pernas",label:"Pernas"},{value:"superiores",label:"Superiores"}]} value={favorite} onChange={v=>{setFavorite(v);setWorkoutReady(false);setCompleted([])}}/></div>
          <button className="primary-btn" onClick={()=>{setWorkoutReady(true);setCompleted([])}}>Criar minha divisão <ArrowRight size={17}/></button>
        </ToolCard>
        <div className="result-side">
          <div className="result-intro"><span className="result-icon"><Dumbbell size={24}/></span><h3>{workoutReady ? "Sua semana de treino" : "Um plano que combina com você"}</h3><p>{workoutReady ? `${days} dias · cerca de ${duration} min · ${place === "casa" ? "em casa" : "na academia"}` : "Ajuste as opções e veja uma sugestão prática de divisão."}</p></div>
          {workoutReady && <div className="workout-progress" aria-live="polite"><div><strong>{completed.length} de {days} treinos</strong><span>concluídos nesta divisão</span></div><Progress value={Math.round(completed.length / days * 100)} aria-label="Progresso dos treinos"/></div>}
          {workoutReady && <div className="workout-list">{workouts.map((w,i)=><div className="workout-day" key={i}><div className="workout-day-head"><strong>{w.title}</strong><button onClick={()=>setCompleted(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i])} className={completed.includes(i)?"done":""} aria-pressed={completed.includes(i)} aria-label={`${completed.includes(i)?"Desmarcar":"Marcar como concluído"} ${w.title}`}>{completed.includes(i)?<Check size={15}/>:<Plus size={15}/>}</button></div><span>{w.series} · descanso confortável entre séries</span><ul>{w.exercises.map(ex=><li key={ex}>{ex}</li>)}</ul></div>)}</div>}
        </div>
      </div>
      <p className="foot-note">O tempo é aproximado. Faça um aquecimento leve, ajuste as cargas à sua técnica e interrompa se sentir dor. Para lesões ou condições de saúde, procure orientação profissional. <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noreferrer">Orientações gerais da OMS</a>.</p>
    </>;
  }

  function renderFood() {
    const avoidLabels: Record<Avoid, string> = { leite: "Leite e derivados", ovos: "Ovos", peixe: "Peixe" };
    return <>
      <PageTitle eyebrow="COMER BEM, SEM COMPLICAÇÃO" title="Sua alimentação, com mais leveza." intro="Monte um exemplo de dia com refeições que se aproximam das suas preferências."/>
      <div className="two-column">
        <ToolCard>
          <h2>Monte seu dia</h2>
          <div className="control-group"><span className="control-label">Estilo alimentar</span><Choice label="Estilo alimentar" options={[{value:"onivora",label:"Variado"},{value:"vegetariana",label:"Vegetariano"},{value:"vegana",label:"Vegano"}]} value={diet} onChange={v=>setDiet(v as DietStyle)}/></div>
          <div className="control-group"><span className="control-label">Quantas refeições prefere?</span><Choice label="Refeições por dia" options={[3,4,5].map(x=>({value:String(x),label:String(x)}))} value={String(meals)} onChange={v=>setMeals(Number(v))}/></div>
          <div className="control-group"><span className="control-label">O que prefere evitar nas sugestões?</span><div className="choices" role="group" aria-label="Ingredientes a evitar">{(["leite","ovos","peixe"] as Avoid[]).map(item=><button type="button" key={item} className={`choice ${avoid.includes(item)?"selected":""}`} aria-pressed={avoid.includes(item)} onClick={()=>setAvoid(old=>old.includes(item)?old.filter(x=>x!==item):[...old,item])}>{avoidLabels[item]}</button>)}</div></div>
          <button className="primary-btn" onClick={()=>setMenuVariant(x=>(x+1)%100001)}>Trocar sugestões <RotateCcw size={17}/></button>
          <p className="small-note">As opções são exemplos sem calorias prescritas. Esta filtragem não garante ausência de alérgenos ou contaminação cruzada; para alergias e dietas clínicas, consulte um nutricionista.</p>
        </ToolCard>
        <div className="meal-plan"><div className="meal-plan-head"><ChefHat size={21}/><strong>Exemplo de um dia</strong></div>{selectedMeals.map((meal,i)=><div className="meal-row" key={meal.label}><span>{String(i+1).padStart(2,"0")}</span><div><strong>{meal.label}</strong><p>{meal.text}</p></div></div>)}</div>
      </div>
      <div className="section-heading compact"><div><span className="eyebrow">INSPIRAÇÃO PARA O PRATO</span><h2>Ideias que cabem na rotina</h2></div></div>
      <div className="recipe-grid">
        {diet === "onivora" ? <article className="recipe-card featured"><img src="/prato-equilibrado.webp" alt="Prato com arroz, feijão, frango grelhado e vegetais" loading="lazy" decoding="async"/><div><span>ALMOÇO COMPLETO</span><h3>O clássico que funciona</h3><p>Arroz, feijão, proteína e vegetais: uma base versátil para variar temperos e acompanhamentos.</p></div></article> : <article className="recipe-card"><div className="recipe-icon"><Utensils size={26}/></div><span>BASE VEGETAL</span><h3>Arroz, feijão e vegetais</h3><p>Combine grãos, leguminosas e vegetais com os temperos de que você gosta.</p></article>}
        <article className="recipe-card"><div className="recipe-icon"><Utensils size={26}/></div><span>RÁPIDO</span><h3>{avoid.includes("ovos") || diet === "vegana" ? "Torrada com homus" : "Omelete colorida"}</h3><p>{avoid.includes("ovos") || diet === "vegana" ? "Pão integral, homus, tomate e folhas, com uma fruta ao lado." : "Ovos, tomate, espinafre e uma fruta ao lado. Fácil de adaptar com os ingredientes da casa."}</p></article>
        <article className="recipe-card"><div className="recipe-icon"><ChefHat size={26}/></div><span>VEGETAL</span><h3>Grão-de-bico & legumes</h3><p>Combine grão-de-bico, legumes assados, folhas e um molho simples de limão.</p></article>
      </div>
      <p className="foot-note">Ajuste por fome, rotina e cultura alimentar. <a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noreferrer">Princípios de alimentação saudável da OMS</a>.</p>
    </>;
  }

  function renderFasting() {
    return <>
      <PageTitle eyebrow="TEMPO E ATENÇÃO" title="Acompanhe seu jejum." intro="Se o jejum faz parte da sua rotina, use o temporizador sem transformar o relógio em cobrança."/>
      <div className="two-column">
        <ToolCard><h2>Escolha uma janela</h2><div className="control-group"><span className="control-label">Duração</span><Choice label="Duração do jejum" options={[12,14,16].map(x=>({value:String(x),label:`${x} horas`}))} value={String(fastHours)} onChange={v=>{stopFast();setFastHours(Number(v))}}/></div><p className="small-note">Você pode encerrar a qualquer momento. Beba água e respeite sinais de desconforto.</p><button className="primary-btn" onClick={fastStart ? stopFast : startFast}>{fastStart ? "Encerrar jejum" : "Iniciar temporizador"} {fastStart ? <X size={17}/> : <ArrowRight size={17}/>}</button></ToolCard>
        <div className="timer-card"><span className="timer-label">{fastStart ? elapsed >= fastHours ? "JANELA CONCLUÍDA" : "TEMPO RESTANTE" : "PRONTO QUANDO VOCÊ ESTIVER"}</span><div className="timer-ring" style={{"--progress": `${Math.min(100, elapsed/fastHours*100)}%`} as React.CSSProperties}><div><Clock3 size={25}/><strong>{fastStart ? remainingText : `${fastHours}:00`}</strong><span>{fastStart ? `${Math.floor(elapsed)}h de ${fastHours}h` : "horas planejadas"}</span></div></div><p>{fastStart ? `Início: ${new Date(fastStart).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}` : "Escolha uma duração e comece quando quiser."}</p></div>
      </div>
      {fastHistory.length > 0 && <div className="history-card"><h2>Últimas sessões</h2>{fastHistory.slice(0,5).map((session,index)=><div className="history-row" key={`${session.start}-${index}`}><span>{new Date(session.start).toLocaleDateString("pt-BR")}</span><strong>{Math.max(0,(session.end-session.start)/3600000).toFixed(1).replace(".",",")} h realizadas</strong><small>janela de {session.hours} h</small></div>)}</div>}
      <div className="info-banner caution"><HeartPulse size={21}/><p>Jejum não é necessário para emagrecer ou ter saúde. Gestantes, menores de idade e pessoas com diabetes, histórico de transtorno alimentar ou uso de medicamentos devem buscar orientação antes de tentar.</p></div>
    </>;
  }

  function renderFreeMeal() {
    return <>
      <PageTitle eyebrow="EQUILÍBRIO DE VERDADE" title="Espaço para comer com prazer." intro="Planeje refeições livres sem culpa e sem compensações. Flexibilidade também faz parte de uma rotina sustentável."/>
      <div className="two-column">
        <ToolCard><h2>Planejar refeição livre</h2><div className="control-group"><span className="control-label">Quantas gostaria de planejar por semana?</span><Choice label="Intenção semanal de refeições livres" options={[1,2,3].map(x=>({value:String(x),label:`${x} ${x===1?"refeição":"refeições"}`}))} value={String(freeFrequency)} onChange={v=>setFreeFrequency(Number(v))}/><p className="small-note">Uma intenção pessoal para organizar a agenda, sem limite rígido.</p></div><form onSubmit={addFreeMeal}><div className="field-grid"><label>Data<input type="date" value={freeDate} onChange={e=>setFreeDate(e.target.value)} required/></label><div className="field-choice"><span>Momento</span><Choice label="Momento da refeição" options={["Almoço","Jantar","Lanche","Outro"].map(x=>({value:x,label:x}))} value={freeType} onChange={v=>setFreeType(v as FreeMeal["meal"])}/></div></div><label className="stacked-label">O que você tem vontade de comer? <span>Opcional</span><input maxLength={100} value={freeNote} onChange={e=>setFreeNote(e.target.value)} placeholder="Ex.: pizza com amigos"/></label><button className="primary-btn" type="submit">Adicionar ao plano <Plus size={17}/></button></form></ToolCard>
        <div className="result-side"><div className="result-intro"><span className="result-icon"><CalendarDays size={24}/></span><h3>Seus momentos planejados</h3><p>{plannedThisWeek} nesta semana · intenção de {freeFrequency}. A agenda pode mudar.</p></div>{freeMeals.length ? <div className="free-list">{freeMeals.map((f,i)=><div className="free-item" key={`${f.date}-${i}`}><div><strong>{new Date(`${f.date}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})} · {f.meal}</strong><span>{f.note || "Refeição livre"}</span></div><button aria-label={`Remover refeição de ${f.date}`} onClick={()=>setFreeMeals(old=>old.filter((_,j)=>j!==i))}><X size={17}/></button></div>)}</div> : <p className="empty-text">Nenhuma refeição planejada ainda.</p>}</div>
      </div>
      <div className="info-banner"><HeartPulse size={20}/><p>Não existe alimento que “estrague” sua semana. Coma com presença, perceba sua saciedade e siga sua rotina normalmente depois.</p></div>
    </>;
  }

  function renderProgress() {
    return <>
      <PageTitle eyebrow="OLHE A CAMINHADA" title="Acompanhe sua evolução." intro="Registre medidas e como você se sente. O contexto vale mais do que um número isolado."/>
      <div className="two-column">
        <ToolCard><h2>Registrar hoje</h2><form onSubmit={addEntry}><label className="stacked-label">Peso <span>kg</span><input type="number" inputMode="decimal" min="25" max="350" step="0.1" value={entryWeight} onChange={e=>setEntryWeight(e.target.value)} placeholder="Ex.: 70,5" required/></label><div className="control-group"><span className="control-label">Como está sua energia?</span><Choice label="Energia hoje" options={[1,2,3,4,5].map(x=>({value:String(x),label:String(x)}))} value={String(entryEnergy)} onChange={v=>setEntryEnergy(Number(v))}/><p className="small-note">1 = baixa · 5 = alta</p></div><label className="stacked-label">Como foi a semana? <span>Opcional</span><textarea maxLength={240} value={entryNote} onChange={e=>setEntryNote(e.target.value)} placeholder="Força, sono, disposição..." rows={3}/></label><button className="primary-btn" type="submit">Salvar registro <Plus size={17}/></button></form><p className="small-note">Um registro por dia. Os dados ficam neste dispositivo e podem ser exportados em Meus dados.</p></ToolCard>
        <div className="result-side"><div className="result-intro"><span className="result-icon"><TrendingUp size={24}/></span><h3>Seus registros</h3><p>{entries.length ? `${entries.length} ${entries.length===1?"registro salvo":"registros salvos"}` : "Seu primeiro registro aparecerá aqui."}</p></div>{entries.length > 1 && <div className="trend-chart" role="img" aria-label={`Evolução de peso de ${entries[0].weight} para ${entries.at(-1)!.weight} quilos`}><div className="chart-bars">{entries.slice(-8).map(e=>{const values=entries.slice(-8).map(x=>x.weight);const min=Math.min(...values)-2,max=Math.max(...values)+2;return <div key={e.date} title={`${e.date}: ${e.weight} kg`} style={{height:`${25+((e.weight-min)/(max-min))*70}%`}}><span>{e.weight}</span></div>})}</div><div className="chart-labels"><span>{entries.at(-8)?.date.slice(5).split("-").reverse().join("/")}</span><span>{entries.at(-1)?.date.slice(5).split("-").reverse().join("/")}</span></div></div>}{entries.slice().reverse().map(e=><div className="entry-row" key={e.date}><div><strong>{new Date(`${e.date}T12:00:00`).toLocaleDateString("pt-BR")}</strong><span>{e.energy ? `Energia ${e.energy}/5 · ` : ""}{e.note || "Sem observação"}</span></div><b>{String(e.weight).replace(".",",")} kg</b><button aria-label={`Remover registro de ${e.date}`} className="remove-entry" onClick={()=>setEntries(old=>old.filter(x=>x.date!==e.date))}><X size={16}/></button></div>)}</div>
      </div>
      <div className="insights-card"><div className="insights-head"><Sparkles size={20}/><div><span className="eyebrow">LEITURA DA SUA ROTINA</span><h2>Pequenos sinais de progresso</h2></div></div><p>{weightChange === null ? "Com dois registros ou mais, você verá uma comparação ao longo do tempo." : `Entre o primeiro e o último registro, o peso ${weightChange > 0 ? "aumentou" : weightChange < 0 ? "diminuiu" : "permaneceu igual"}${weightChange === 0 ? "" : ` ${Math.abs(weightChange).toFixed(1).replace(".",",")} kg`}. Observe a tendência junto com energia, força e bem-estar.`}</p><div className="insight-stats"><span><strong>{completed.length}</strong> treinos marcados</span><span><strong>{latestEnergy ? `${latestEnergy}/5` : "—"}</strong> energia mais recente</span><span><strong>{entries.length}</strong> registros</span></div><small>Resumo automático dos dados deste dispositivo. Não é uma avaliação de saúde.</small></div>
    </>;
  }

  function renderCoach() {
    return <>
      <PageTitle eyebrow="UM PASSO DE CADA VEZ" title="Seu assistente de rotina." intro="Tire dúvidas sobre as ferramentas e encontre próximos passos possíveis para sua semana."/>
      <div className="coach-layout"><div className="chat-panel"><div className="chat-head"><div><span className="chat-avatar"><Sparkles size={21}/></span><div><strong>Assistente Pulso</strong><span>{aiAvailable && aiConsent ? "IA online ativada" : "Respostas locais · sem envio à IA"}</span></div></div></div><div className="chat-messages" aria-live="polite">{chat.map((m,i)=><div className={`chat-message ${m.role}`} key={i}>{m.role==="assistant" && <span className="message-avatar"><Sparkles size={16}/></span>}<div><p>{m.text}</p>{m.local && <small>Resposta local · sem IA conectada</small>}</div></div>)}{busy && <div className="chat-message assistant"><span className="message-avatar"><Sparkles size={16}/></span><div><p>Preparando uma resposta...</p></div></div>}</div><form className="chat-form" onSubmit={askCoach}><input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Pergunte sobre treinos, refeições ou hábitos..." aria-label="Mensagem para o assistente" maxLength={700}/><button type="submit" disabled={busy || !prompt.trim()} aria-label="Enviar mensagem"><Send size={19}/></button></form></div>
        <aside className="coach-aside"><div className="assistant-card"><Sparkles size={25}/><h3>Comece por aqui</h3><p>Escolha uma pergunta ou escreva a sua.</p>{["Como começar a treinar?","Como organizar minhas refeições?","Como acompanhar meu progresso?"].map(q=><button key={q} onClick={()=>setPrompt(q)}>{q}<ArrowRight size={15}/></button>)}</div><div className="ai-card"><div className="ai-status"><span className={aiAvailable?"status-on":"status-off"}/><strong>{aiAvailable ? "IA online configurada" : "IA online não configurada"}</strong></div><label className="ai-opt-in"><input type="checkbox" checked={aiConsent} disabled={!aiAvailable} onChange={event=>setAiConsent(event.target.checked)}/><span>Ativar respostas da IA online</span></label><p>Quando ativada, a pergunta e um resumo dos registros, variação de peso, energia, treinos e preferências são enviados à OpenAI. Notas e pesos exatos não são enviados. Você pode desligar a qualquer momento.</p><button className="text-link" onClick={()=>go("dados")}>Como meus dados são usados <ArrowRight size={15}/></button></div></aside>
      </div>
      <div className="info-banner"><ShieldCheck size={20}/><p>Orientações gerais, sem substituir profissionais de saúde. Se a IA online falhar, o assistente oferece uma resposta local identificada.</p></div>
    </>;
  }

  function renderData() {
    return <>
      <PageTitle eyebrow="CONTROLE NAS SUAS MÃOS" title="Seus dados, suas escolhas." intro="Veja onde suas informações ficam e salve uma cópia para não perder seus registros."/>
      <div className="data-grid"><div className="data-card"><span className="result-icon"><Database size={23}/></span><h2>Salvos neste navegador</h2><p>Medidas, preferências, treinos, refeições e histórico de jejum ficam neste dispositivo. Não há conta ou sincronização entre aparelhos. Limpar os dados do navegador pode apagar estes registros.</p><div className="data-stats"><span><strong>{entries.length}</strong> registros</span><span><strong>{freeMeals.length}</strong> refeições</span><span><strong>{fastHistory.length}</strong> jejuns encerrados</span></div></div><div className="data-card"><span className="result-icon"><ShieldCheck size={23}/></span><h2>IA sob sua escolha</h2><p>A IA online começa desligada. Se você ativar no Assistente, sua pergunta e um resumo limitado dos registros e preferências serão enviados à OpenAI. As notas livres e os pesos exatos não entram nesse resumo.</p><span className="privacy-state">{aiAvailable && aiConsent ? "Envio para IA ativado" : "Envio para IA desligado"}</span><a className="source-link" href="/privacidade">Ler aviso de privacidade <ArrowRight size={14}/></a></div></div>
      <div className="data-actions"><h2>Guardar ou restaurar uma cópia</h2><p>O arquivo de backup inclui seus registros e preferências. Guarde-o em um local seguro. Restaurar substitui os dados atuais deste navegador.</p><div className="action-row"><button className="primary-btn" onClick={exportData}><Download size={17}/> Exportar backup</button><button className="secondary-btn" onClick={()=>importRef.current?.click()}><Upload size={17}/> Escolher backup</button><input ref={importRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Selecionar backup do Pulso" onChange={chooseImport}/></div>
        {pendingImport && <div className="pending-import"><strong>Backup encontrado</strong><p>Exportado em {new Date(pendingImport.exportedAt).toLocaleDateString("pt-BR")}: {pendingImport.data.entries.length} {pendingImport.data.entries.length===1?"registro":"registros"}, {pendingImport.data.freeMeals.length} {pendingImport.data.freeMeals.length===1?"refeição":"refeições"} e {pendingImport.data.fastHistory.length} {pendingImport.data.fastHistory.length===1?"sessão":"sessões"} de jejum. A restauração substituirá os dados atuais.</p><div className="action-row"><button className="primary-btn" onClick={applyImport}>Restaurar estes dados</button><button className="secondary-btn" onClick={()=>setPendingImport(null)}>Cancelar</button></div></div>}
        {dataNotice && <p className="data-notice" role="status">{dataNotice}</p>}
      </div>
      <div className="erase-card"><div><Trash2 size={20}/><h2>Apagar dados deste dispositivo</h2><p>Esta ação remove os registros do Pulso deste navegador. Faça um backup antes se quiser guardá-los.</p></div>{confirmErase ? <div className="action-row"><button className="danger-btn" onClick={eraseData}>Sim, apagar meus dados</button><button className="secondary-btn" onClick={()=>setConfirmErase(false)}>Cancelar</button></div> : <button className="secondary-btn" onClick={()=>setConfirmErase(true)}>Apagar meus dados</button>}</div>
    </>;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark"><HeartPulse size={21} strokeWidth={2.6}/></span><span>pulso<span className="brand-dot">.</span></span></div>
      <div className="sidebar-eyebrow">SEU ESPAÇO</div>
      <nav aria-label="Navegação principal" className="nav-list">{nav.map(({id,label,icon:Icon}) => <button key={id} className={`nav-item ${section===id ? "active" : ""}`} onClick={() => go(id)} aria-current={section===id ? "page" : undefined}><Icon size={18}/><span>{label}</span>{section===id && <span className="nav-active-indicator"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={18}/><strong>Consistência vence pressa.</strong><span>Um passo de cada vez.</span></div><div className="sidebar-foot">PULSO FITNESS · 2026</div></div>
    </aside>
    {menuOpen && <button className="mobile-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}/>}
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Acesso rápido" description="Encontre uma ferramenta do Pulso" className="quick-dialog">
      <CommandInput placeholder="Buscar ferramenta..." aria-label="Buscar ferramenta" />
      <CommandList><CommandEmpty>Nenhuma ferramenta encontrada.</CommandEmpty><CommandGroup heading="Seu espaço">{nav.map(({ id, label, icon: Icon }) => <CommandItem key={id} value={label} onSelect={() => go(id)}><Icon size={17}/><span>{label}</span>{section === id && <CommandShortcut>ATUAL</CommandShortcut>}</CommandItem>)}</CommandGroup></CommandList>
    </CommandDialog>
    <main className="main"><header className="topbar"><button className="mobile-menu" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22}/> : <Menu size={22}/>}</button><span className="topbar-path">Meu espaço <span>/</span> {nav.find(n=>n.id===section)?.label}</span><button className="quick-nav" onClick={() => setSearchOpen(true)} aria-label="Buscar ferramenta"><Search size={16}/><span>Buscar ferramenta</span><kbd>Ctrl K</kbd></button></header>
      <div className="content">
      {section === "visao" && <>
        <section className="hero"><div className="hero-copy"><div className="eyebrow light"><span className="eyebrow-line"/> BEM-VINDO AO SEU ESPAÇO</div><h1>Sua evolução<br/><em>começa aqui.</em></h1><p>Treino, alimentação e hábitos em um lugar só. Organize sua rotina de um jeito que funciona para você.</p><button className="hero-cta" onClick={()=>go("treinos")}>Montar meu treino <ArrowRight size={18}/></button></div><div className="hero-visual"><div className="visual-orbit orbit-one" aria-hidden="true"/><div className="visual-orbit orbit-two" aria-hidden="true"/><div className="hero-dashboard"><div className="dashboard-kicker"><Activity size={15}/> SUA SEMANA EM FOCO</div><div className="dashboard-number"><strong>{String(completed.length).padStart(2,"0")}</strong><span>treinos marcados<br/>como concluídos</span></div><div className="dashboard-detail"><span>Registros de evolução</span><strong>{String(entries.length).padStart(2,"0")}</strong></div><div className="dashboard-detail"><span>Jejum</span><strong>{fastStart ? "Em andamento" : "Sem sessão ativa"}</strong></div></div></div></section>
        <div className="section-heading"><div><span className="eyebrow">COMECE POR AQUI</span><h2>O que vamos cuidar hoje?</h2></div><span className="heading-aside">Escolha uma ferramenta para começar</span></div>
        <div className="feature-grid"><button className="feature-card" onClick={()=>go("imc")}><span className="feature-icon lime"><Activity size={23}/></span><span className="feature-index">01</span><strong>Descubra seu IMC</strong><span>Entenda seu ponto de partida com uma medida simples.</span><ArrowRight className="feature-arrow" size={20}/></button><button className="feature-card" onClick={()=>go("treinos")}><span className="feature-icon blue"><Dumbbell size={23}/></span><span className="feature-index">02</span><strong>Monte seu treino</strong><span>Uma rotina de musculação alinhada com seus gostos.</span><ArrowRight className="feature-arrow" size={20}/></button><button className="feature-card" onClick={()=>go("alimentacao")}><span className="feature-icon peach"><ChefHat size={23}/></span><span className="feature-index">03</span><strong>Planeje suas refeições</strong><span>Ideias de pratos e organização sem rigidez.</span><ArrowRight className="feature-arrow" size={20}/></button></div>
        <div className="overview-lower"><div className="mini-panel"><Clock3 size={21}/><h3>Jejum, se fizer sentido</h3><p>Acompanhe seu tempo com atenção ao corpo.</p><button onClick={()=>go("jejum")}>Abrir temporizador <ArrowRight size={16}/></button></div><div className="mini-panel"><TrendingUp size={21}/><h3>Seu progresso</h3><p>{entries.length ? `${entries.length} registro${entries.length>1?"s":""} de evolução salvo${entries.length>1?"s":""} neste dispositivo.` : "Registre sua evolução além da balança."}</p><button onClick={()=>go("evolucao")}>Ver evolução <ArrowRight size={16}/></button></div></div>
        <div className="quick-strip"><div><Target size={22}/><span><strong>Seu plano é seu.</strong> Ajuste hábitos ao seu momento e acompanhe pequenas vitórias.</span></div><button onClick={()=>go("coach")}>Conversar com assistente <ArrowRight size={17}/></button></div>
      </>}
      {section === "imc" && <><PageTitle eyebrow="PONTO DE PARTIDA" title="Conheça seu IMC." intro="Uma conta simples para adultos. Use o resultado como referência, não como diagnóstico."/><ToolCard className="bmi-layout"><div><h2>Seus dados</h2><div className="field-grid"><label>Altura <span>cm</span><input type="number" min="100" max="230" value={height} onChange={e=>setHeight(Number(e.target.value))}/></label><label>Peso <span>kg</span><input type="number" min="25" max="350" value={weight} onChange={e=>setWeight(Number(e.target.value))}/></label></div><p className="small-note">O IMC não considera composição corporal ou condições de saúde. A interpretação muda para crianças, adolescentes e gestantes.</p><a className="source-link" href="https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight" target="_blank" rel="noreferrer">Saiba mais na OMS <ArrowRight size={14}/></a></div><div className="bmi-result"><span>SEU IMC</span><strong>{validBmi ? bmi.toFixed(1).replace(".",",") : "—"}</strong><div>{validBmi ? category : "Confira os valores"}</div><div className="bmi-scale" aria-label="Escala de referência do IMC para adultos"><div className="bmi-scale-track"><i/><i/><i/><i/>{validBmi && <span className="bmi-marker" style={{left: `${bmiMarker}%`}}/>}</div><div className="bmi-scale-labels"><span>18,5</span><span>25</span><span>30</span></div></div></div></ToolCard><div className="info-banner"><BookOpen size={20}/><p>O número não conta a história toda. Sua força, energia, sono e exames também importam.</p></div></>}
      {section === "treinos" && renderWorkout()}
      {section === "alimentacao" && renderFood()}
      {section === "jejum" && renderFasting()}
      {section === "flexivel" && renderFreeMeal()}
      {section === "evolucao" && renderProgress()}
      {section === "coach" && renderCoach()}
      {section === "dados" && renderData()}
      <footer className="footer"><span>pulso<span>.</span> · cuide do processo</span><span>Orientações gerais para adultos · <a href="/privacidade">Privacidade</a> · <button onClick={()=>go("dados")}>Meus dados</button></span></footer>
      </div>
    </main>
  </div>;
}
