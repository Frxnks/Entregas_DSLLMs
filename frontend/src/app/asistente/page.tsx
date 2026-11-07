'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, ChevronDown, Database, FileSearch, Loader2, Send, ShieldCheck, UserCheck, XCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_ASSISTANT_API_URL ?? 'http://127.0.0.1:8002/api';
type Citation = { chunk_id:string; code:string; title:string; section:string; version:string; status:string; source:string; text:string };
type Trace = { tool:string; arguments:Record<string, unknown>; ok:boolean; summary:string };
type Action = { token:string; case_id:string; documents:string[]; reason:string; expires_at:string };
type AssistantResponse = { answer:string; state:'evidencia'|'abstencion'|'conflicto'|'error'; citations:Citation[]; traces:Trace[]; action?:Action; model?:string; notice?:string };
type Message = { id:string; role:'user'|'assistant'; text:string; response?:AssistantResponse };
type Session = { session_id:string; user_id:string; role:string; org_id:string; display_name:string };
const USERS = [
  { id:'U-01', label:'Paula Rojas · Operador ORG-01' }, { id:'U-02', label:'Andrés Muñoz · Supervisor ORG-01' },
  { id:'U-03', label:'Ignacio Bravo · Consulta ORG-01' }, { id:'U-04', label:'Javiera Soto · Operador ORG-02' },
];

function stateStyle(state:AssistantResponse['state']) {
  if (state === 'conflicto') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (state === 'abstencion') return 'bg-slate-100 text-slate-700 border-slate-300';
  if (state === 'error') return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
}

export default function AssistantPage() {
  const [userId,setUserId]=useState('U-01'); const [session,setSession]=useState<Session|null>(null);
  const [messages,setMessages]=useState<Message[]>([]); const [input,setInput]=useState('¿Por qué se derivó el caso C-012 si tiene 86 puntos?');
  const [loading,setLoading]=useState(false); const [serviceError,setServiceError]=useState<string|null>(null);
  useEffect(()=>{ let active=true; setSession(null); setMessages([]); setServiceError(null);
    fetch(`${API_URL}/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:userId})})
      .then(async response=>{if(!response.ok) throw new Error((await response.json()).detail??'No se pudo iniciar la sesión'); return response.json();})
      .then(data=>active&&setSession(data)).catch(error=>active&&setServiceError(error.message)); return()=>{active=false};
  },[userId]);
  async function send(event:FormEvent){event.preventDefault(); const question=input.trim(); if(!question||!session||loading)return;
    setMessages(current=>[...current,{id:crypto.randomUUID(),role:'user',text:question}]); setInput('');setLoading(true);setServiceError(null);
    try{const response=await fetch(`${API_URL}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:session.session_id,message:question})});const data=await response.json();if(!response.ok)throw new Error(data.detail??'El asistente no pudo responder');setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:data.answer,response:data}]);}
    catch(error){const text=error instanceof Error?error.message:'Error inesperado';setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text,response:{answer:text,state:'error',citations:[],traces:[]}}]);}finally{setLoading(false);}}
  async function confirm(action:Action,messageId:string){if(!session||loading)return;setLoading(true);setServiceError(null);try{const response=await fetch(`${API_URL}/acciones/confirmar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:session.session_id,token:action.token})});const data=await response.json();if(!response.ok)throw new Error(data.detail??'La acción fue rechazada');setMessages(current=>current.map(message=>message.id===messageId?{...message,text:`${message.text}\n\nAcción confirmada: ${data.data.message}. ID ${data.data.solicitud_id}.`,response:{...message.response!,action:undefined}}:message));}catch(error){setServiceError(error instanceof Error?error.message:'No se pudo confirmar');}finally{setLoading(false);}}
  return <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 min-h-[70vh]">
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <header className="p-5 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-sky-50"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="p-2.5 bg-violet-600 text-white rounded-lg"><Bot className="w-6 h-6"/></div><div><h1 className="text-xl font-bold">Asistente del operador</h1><p className="text-sm text-slate-600">Explica con evidencia; la decisión siempre es humana.</p></div></div><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200">CU-1 · v3.0</span></div></header>
      <div className="flex-1 p-5 space-y-5 overflow-y-auto bg-slate-50/60">
        {messages.length===0&&<div className="max-w-xl mx-auto mt-10 text-center text-slate-600"><FileSearch className="w-10 h-10 mx-auto mb-3 text-violet-500"/><p className="font-semibold text-slate-800">Pregunta por un caso o una regla</p><p className="text-sm mt-1">Las citas y llamadas MCP aparecerán debajo de cada respuesta.</p></div>}
        {messages.map(message=><article key={message.id} className={`max-w-3xl ${message.role==='user'?'ml-auto':'mr-auto'}`}>
          <div className={message.role==='user'?'bg-sky-700 text-white rounded-2xl rounded-br-sm px-4 py-3':'bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm'}>{message.response&&<span className={`inline-flex text-xs font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 mb-3 ${stateStyle(message.response.state)}`}>{message.response.state}</span>}<p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>{message.response?.notice&&<p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{message.response.notice}</p>}</div>
          {message.response?.citations.map(citation=><details key={citation.chunk_id} className="mt-2 bg-white border border-slate-200 rounded-lg text-sm"><summary className="cursor-pointer p-3 flex items-center gap-2 font-medium"><ChevronDown className="w-4 h-4"/>{citation.code} · {citation.section} · v{citation.version} ({citation.status})</summary><div className="border-t border-slate-100 p-3 whitespace-pre-wrap text-slate-700 max-h-56 overflow-auto">{citation.text}</div></details>)}
          {message.response&&message.response.traces.length>0&&<details className="mt-2 bg-slate-900 text-slate-100 rounded-lg text-sm"><summary className="cursor-pointer p-3 flex items-center gap-2"><Database className="w-4 h-4 text-sky-400"/>Traza MCP · {message.response.traces.length} llamada(s)</summary><div className="border-t border-slate-700 p-3 space-y-2">{message.response.traces.map((trace,index)=><div key={`${trace.tool}-${index}`} className="flex gap-2">{trace.ok?<CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>:<XCircle className="w-4 h-4 text-red-400 shrink-0"/>}<div><p className="font-mono">{trace.tool}</p><p className="text-xs text-slate-400">{trace.summary}</p></div></div>)}</div></details>}
          {message.response?.action&&<div className="mt-2 p-4 rounded-lg border-2 border-violet-300 bg-violet-50"><p className="font-semibold text-violet-950">Acción preparada para {message.response.action.case_id}</p><p className="text-sm mt-1">{message.response.action.reason}</p><button onClick={()=>confirm(message.response!.action!,message.id)} disabled={loading} className="mt-3 px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-semibold hover:bg-violet-600 disabled:opacity-50">Confirmar y registrar</button></div>}
        </article>)}
        {loading&&<div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Procesando y registrando trazas…</div>}
      </div>
      <form onSubmit={send} className="p-4 border-t border-slate-200 bg-white flex gap-3"><textarea value={input} onChange={event=>setInput(event.target.value)} rows={2} maxLength={4000} placeholder="Escribe una pregunta…" className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"/><button disabled={!session||loading||!input.trim()} className="self-end p-3 bg-violet-700 text-white rounded-lg hover:bg-violet-600 disabled:opacity-40" aria-label="Enviar"><Send className="w-5 h-5"/></button></form>
    </section>
    <aside className="space-y-4"><div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Usuario de demostración</label><select value={userId} onChange={event=>setUserId(event.target.value)} className="mt-2 w-full border border-slate-300 rounded-lg p-2 text-sm">{USERS.map(user=><option key={user.id} value={user.id}>{user.label}</option>)}</select>{session&&<div className="mt-3 text-xs bg-slate-50 rounded-lg p-3 space-y-1"><p className="flex items-center gap-2 font-semibold"><UserCheck className="w-4 h-4 text-sky-600"/>{session.display_name}</p><p>Rol: {session.role}</p><p>Organización: {session.org_id}</p></div>}</div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-sm"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-5 h-5 text-emerald-600"/>Controles activos</p><ul className="mt-3 space-y-2 text-slate-600 list-disc pl-5"><li>Citas con versión y vigencia</li><li>Acceso por organización</li><li>Confirmación antes de escribir</li><li>Sanitización antes del modelo</li></ul></div>
      {serviceError&&<div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"><p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>Servicio no disponible</p><p className="mt-1">{serviceError}</p></div>}
    </aside>
  </div>;
}
