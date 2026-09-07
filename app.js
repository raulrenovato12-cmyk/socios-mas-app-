
const API="https://wlpsjsuobxyftpxsyeyi.supabase.co/functions/v1/socios-mas-api";
const SESSION_KEY="sociosMasCloudSessionV1";
let session=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
let currentUser=session?.user||null;
let db={clientes:[],creditos:[],cuotas:[],pagos:[],renovaciones:[],gastos:[],movimientos:[],configuracion:[]};

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(Number(n||0));
function localToday(){
  const d=new Date(), p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

async function api(action,data={},withSession=true){
  const headers={"Content-Type":"application/json"};
  if(withSession && session?.token) headers["x-session-token"]=session.token;
  const res=await fetch(API,{method:"POST",headers,body:JSON.stringify({action,...data})});
  const out=await res.json().catch(()=>({error:"Respuesta inválida del servidor"}));
  if(!res.ok){
    if(res.status===401 && action!=="login"){clearSession(); showLogin();}
    throw new Error(out.error||"Error de conexión");
  }
  return out;
}
function saveSession(s){session=s;currentUser=s.user;localStorage.setItem(SESSION_KEY,JSON.stringify(s));}
function clearSession(){session=null;currentUser=null;localStorage.removeItem(SESSION_KEY);}
function perms(){return currentUser?.rol==="Administrador"?{all:true,admin:true}:currentUser?.rol==="Gerente"?{all:true,admin:false}:{all:false,admin:false};}
function cfg(key, fallback=null){
  const row=(db.configuracion||[]).find(x=>x.clave===key);
  return row ? row.valor : fallback;
}
function setCloudState(text, ok=true){
  const el=$("cloudBadge"); if(!el)return;
  el.textContent=`Nube: ${text}`;
  el.dataset.state=ok?"ok":"error";
}

async function initialize(){
  setCloudState("conectando…", true);
  try{
    const status=await api("status",{},false);
    setCloudState("disponible", true);
    if(status.needsBootstrap){
      await showBootstrap(status.users||[]);
      return;
    }
    populateLoginUsers(status.users||[]);
    if(session?.token){
      try{
        const me=await api("me");
        currentUser=me.user;
        session.user=currentUser;
        localStorage.setItem(SESSION_KEY,JSON.stringify(session));
        await sync();
        return;
      }catch{}
    }
    showLogin();
  }catch(e){
    setCloudState("sin conexión", false);
    alert("No fue posible conectar con la nube: "+e.message);
    showLogin();
  }
}

function populateLoginUsers(users){
  $("loginUsuario").innerHTML=users.filter(u=>u.configured).map(u=>`<option value="${esc(u.nombre)}">${esc(u.nombre)} · ${esc(u.rol)}</option>`).join("");
}
async function showBootstrap(users){
  $("dialogLogin").close?.();
  $("bootstrapUsers").innerHTML=users.map(u=>`
    <label>${esc(u.nombre)} · ${esc(u.rol)}
      <input type="password" inputmode="numeric" minlength="4" maxlength="8" required data-user-id="${esc(u.id)}" placeholder="Nuevo PIN">
    </label>`).join("");
  if(!$("dialogBootstrap").open) $("dialogBootstrap").showModal();
}
function showLogin(){if(!$("dialogLogin").open)$("dialogLogin").showModal();}

$("confirmarBootstrap").addEventListener("click",async e=>{
  e.preventDefault();
  const pins={}; let valid=true;
  document.querySelectorAll("#bootstrapUsers input").forEach(i=>{
    if(!/^\d{4,8}$/.test(i.value)){valid=false;return;}
    pins[i.dataset.userId]=i.value;
  });
  if(!valid){alert("Cada PIN debe contener de 4 a 8 dígitos.");return;}
  try{
    await api("bootstrap",{pins},false);
    $("dialogBootstrap").close();
    const status=await api("status",{},false);
    setCloudState("disponible", true);
    populateLoginUsers(status.users||[]);
    alert("Usuarios activados. Ya puedes iniciar sesión.");
    showLogin();
  }catch(err){alert(err.message);}
});

$("confirmarLogin").addEventListener("click",async e=>{
  e.preventDefault();
  const f=new FormData($("formLogin"));
  try{
    const out=await api("login",{nombre:f.get("usuarioId"),pin:f.get("pin")},false);
    saveSession(out);
    $("dialogLogin").close();
    $("formLogin").reset();
    await sync();
  }catch(err){alert(err.message);}
});
$("cerrarSesion").addEventListener("click",async ()=>{
  try{await api("logout");}catch{}
  clearSession(); renderIdentity(); showLogin();
});

async function sync(){
  setCloudState("sincronizando…", true);
  const out=await api("snapshot");
  db=out.data;
  renderAll();
  setCloudState("sincronizada", true);
  const d=new Date();
  const el=$("ultimaSync");
  if(el) el.textContent=`Última sincronización: ${d.toLocaleString("es-MX")}`;
}
function renderIdentity(){
  $("usuarioBadge").textContent=currentUser?`${currentUser.nombre} · ${currentUser.rol}`:"Sin sesión";
  $("cerrarSesion").style.display=currentUser?"":"none";
  $("actualizarNube").style.display=currentUser?"":"none";
  document.querySelectorAll(".admin-only").forEach(el=>el.style.display=currentUser?.rol==="Administrador"?"":"none");
}
function renderAll(){
  renderIdentity(); renderSelects(); renderClientes(); renderCreditos(); renderPagos(); renderGastos(); renderRenovaciones(); renderDashboard(); renderResumenCartera(); renderReporte(); renderAuditoria(); renderConfigUsuarios();
  document.querySelectorAll('input[type="date"]').forEach(i=>{if(!i.value)i.value=localToday();});
}

function clientName(id){return db.clientes.find(c=>c.id===id)?.nombre||"Cliente";}
function creditLabel(c){return `${clientName(c.cliente_id)} · ${money(c.monto)} · ${c.estado}`;}
function paidInstallments(creditId){return db.cuotas.filter(q=>q.credito_id===creditId && q.estado==="Pagado").length;}
function remainingCredit(c){return Math.max(0,Number(c.total_pactado)-Number(c.capital_recuperado||0)-Number(c.utilidad_recuperada||0));}
function activeCredits(){return db.creditos.filter(c=>c.estado==="Activo"||c.estado==="Mora");}

function renderSelects(){
  $("creditoCliente").innerHTML='<option value="">Selecciona</option>'+db.clientes.filter(c=>["Activo","Prospecto","Renovación disponible"].includes(c.estado)).map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join("");
  $("pagoCredito").innerHTML='<option value="">Selecciona</option>'+activeCredits().map(c=>`<option value="${c.id}">${esc(creditLabel(c))}</option>`).join("");
}
function renderClientes(){
  $("listaClientes").innerHTML=db.clientes.length?`<table><tr><th>Cliente</th><th>Teléfono</th><th>Aval</th><th>Estado</th></tr>${db.clientes.map(c=>`<tr><td>${esc(c.nombre)}</td><td>${esc(c.telefono||"")}</td><td>${esc(c.aval||"")}</td><td>${esc(c.estado)}</td></tr>`).join("")}</table>`:"<p>Sin clientes registrados.</p>";
}
function renderCreditos(){
  $("listaCreditos").innerHTML=db.creditos.length?`<table><tr><th>Cliente</th><th>Monto</th><th>Pago</th><th>Pagos completos</th><th>Pendiente</th><th>Estado</th></tr>${db.creditos.map(c=>`<tr><td>${esc(clientName(c.cliente_id))}</td><td>${money(c.monto)}</td><td>${money(c.pago_programado)}</td><td>${paidInstallments(c.id)}/${c.numero_pagos}</td><td>${money(remainingCredit(c))}</td><td>${esc(c.estado)}</td></tr>`).join("")}</table>`:"<p>Sin créditos.</p>";
}
function renderPagos(){
  const rows=[...db.pagos].sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));
  $("listaPagos").innerHTML=rows.length?`<table><tr><th>Fecha</th><th>Cliente</th><th>Pago #</th><th>Monto</th><th>Capital</th><th>Utilidad</th></tr>${rows.map(p=>{const c=db.creditos.find(x=>x.id===p.credito_id);return `<tr><td>${esc(p.fecha)}</td><td>${esc(clientName(c?.cliente_id))}</td><td>${p.numero_pago||""}</td><td>${money(p.monto)}</td><td>${money(p.capital)}</td><td>${money(p.utilidad)}</td></tr>`}).join("")}</table>`:"<p>Sin pagos.</p>";
}
function renderGastos(){
  $("listaGastos").innerHTML=db.gastos.length?`<table><tr><th>Fecha</th><th>Responsable</th><th>Tipo</th><th>Concepto</th><th>Importe</th></tr>${[...db.gastos].sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).map(g=>`<tr><td>${esc(g.fecha)}</td><td>${esc(g.responsable)}</td><td>${esc(g.tipo)}</td><td>${esc(g.concepto)}</td><td>${money(g.importe)}</td></tr>`).join("")}</table>`:"<p>Sin gastos.</p>";
}
function eligibleCredits(){return activeCredits().filter(c=>paidInstallments(c.id)>=18);}
function renderRenovaciones(){
  const rows=eligibleCredits();
  $("listaRenovaciones").innerHTML=rows.length?`<table><tr><th>Cliente</th><th>Crédito</th><th>Pagos</th><th>Saldo</th><th></th></tr>${rows.map(c=>`<tr><td>${esc(clientName(c.cliente_id))}</td><td>${money(c.monto)}</td><td>${paidInstallments(c.id)}</td><td>${money(remainingCredit(c))}</td><td><button onclick="openRenew('${c.id}')">Renovar</button></td></tr>`).join("")}</table>`:"<p>No hay créditos elegibles todavía. La renovación se habilita desde el pago 18.</p>";
}
function renderDashboard(){
  const caja=Number(cfg("caja_migrada", db.movimientos.reduce((s,m)=>s+Number(m.importe||0),0)));
  const colocado=activeCredits().reduce((s,c)=>s+Number(c.monto||0),0);
  const recuperado=activeCredits().reduce((s,c)=>s+Number(c.capital_recuperado||0),0);
  const utilidad=activeCredits().reduce((s,c)=>s+Number(c.utilidad_recuperada||0),0);
  const pendiente=activeCredits().reduce((s,c)=>s+remainingCredit(c),0);
  $("kpiCapital").textContent=money(caja);
  $("kpiColocado").textContent=money(colocado);
  $("kpiRecuperado").textContent=money(recuperado);
  $("kpiUtilidad").textContent=money(utilidad);
  $("kpiPendiente").textContent=money(pendiente);
  $("kpiRenovaciones").textContent=eligibleCredits().length;
}
function renderResumenCartera(){
  const corte=cfg("corte_datos","sin definir");
  const capitalReal=Number(cfg("capital_real_pendiente_corte",0));
  const saldoCorte=Number(cfg("saldo_contractual_activo_corte",activeCredits().reduce((s,c)=>s+remainingCredit(c),0)));
  const pagosHoy=db.pagos.filter(p=>p.fecha===localToday()).reduce((s,p)=>s+Number(p.monto||0),0);
  $("resumenCartera").innerHTML=`
    <table>
      <tr><th>Corte migrado</th><td>${esc(corte)}</td></tr>
      <tr><th>Clientes cargados</th><td>${db.clientes.length}</td></tr>
      <tr><th>Créditos activos</th><td>${activeCredits().length}</td></tr>
      <tr><th>Saldo contractual al corte</th><td>${money(saldoCorte)}</td></tr>
      <tr><th>Capital real pendiente al corte</th><td>${money(capitalReal)}</td></tr>
      <tr><th>Cobranza registrada hoy</th><td>${money(pagosHoy)}</td></tr>
    </table>`;
}
function renderReporte(){
  const admin=db.gastos.filter(g=>g.tipo==="Administrativo").reduce((s,g)=>s+Number(g.importe),0);
  const oper=db.gastos.filter(g=>g.tipo==="Operativo").reduce((s,g)=>s+Number(g.importe),0);
  const pagos=db.pagos.reduce((s,p)=>s+Number(p.monto),0);
  const corte=cfg("corte_datos","sin definir");
  const caja=Number(cfg("caja_migrada",0));
  const capitalReal=Number(cfg("capital_real_pendiente_corte",0));
  $("reporteTexto").textContent=[
    "SOCIOS MÁS — REPORTE CONSOLIDADO EN NUBE",
    `Corte histórico migrado: ${corte}`,
    `Clientes: ${db.clientes.length}`,
    `Créditos activos: ${activeCredits().length}`,
    `Pagos históricos cargados: ${db.pagos.length}`,
    `Cobranza histórica registrada: ${money(pagos)}`,
    `Gasto administrativo: ${money(admin)}`,
    `Gasto operativo: ${money(oper)}`,
    `Saldo contractual activo: ${money(activeCredits().reduce((s,c)=>s+remainingCredit(c),0))}`,
    `Capital real pendiente al corte: ${money(capitalReal)}`,
    `Caja migrada al corte: ${money(caja)}`,
    `Renovaciones disponibles: ${eligibleCredits().length}`
  ].join("\n");
}
function renderAuditoria(){
  const rows=[...db.movimientos].sort((a,b)=>String(b.created_at||b.fecha).localeCompare(String(a.created_at||a.fecha))).slice(0,100);
  $("listaAuditoria").innerHTML=rows.length?`<table><tr><th>Fecha</th><th>Tipo</th><th>Importe</th><th>Detalle</th></tr>${rows.map(m=>`<tr><td>${esc(m.fecha)}</td><td>${esc(m.tipo)}</td><td>${money(m.importe)}</td><td>${esc(m.descripcion||"")}</td></tr>`).join("")}</table>`:"<p>Sin movimientos.</p>";
}
function renderConfigUsuarios(){
  $("listaUsuarios").innerHTML=currentUser?`<table><tr><th>Usuario</th><th>Rol</th><th>Estado</th></tr><tr><td>${esc(currentUser.nombre)}</td><td>${esc(currentUser.rol)}</td><td>Sesión activa</td></tr></table>`:"";
}

function creditCalc(monto,valorPorMil,numeroPagos){
  const pago=(Number(monto)/1000)*Number(valorPorMil);
  const total=pago*Number(numeroPagos);
  return {pago,total,utilidad:total-Number(monto)};
}
function scheduleDates(start,n,frequency="Diario"){
  const out=[]; let d=new Date(start+"T12:00:00");
  while(out.length<n){
    const day=d.getDay();
    if(frequency==="Semanal" || (day!==0&&day!==6)) out.push(d.toISOString().slice(0,10));
    d.setDate(d.getDate()+(frequency==="Semanal"?7:1));
  }
  return out;
}
async function addMovement(tipo,importe,descripcion,fecha,refType=null,refId=null){
  return api("insert",{table:"movimientos",data:{fecha,tipo,importe,categoria:tipo,descripcion,referencia_tipo:refType,referencia_id:refId}});
}

$("formCliente").addEventListener("submit",async e=>{
  e.preventDefault(); if(!perms().all)return;
  const f=new FormData(e.target);
  try{
    await api("insert",{table:"clientes",data:{nombre:f.get("nombre"),telefono:f.get("telefono")||null,direccion:f.get("direccion")||null,curp:f.get("curp")||null,aval:f.get("aval")||null,telefono_aval:f.get("telefonoAval")||null,estado:"Activo"}});
    e.target.reset(); await sync();
  }catch(err){alert(err.message);}
});

$("formCredito").addEventListener("submit",async e=>{
  e.preventDefault(); const f=new FormData(e.target);
  const monto=Number(f.get("monto")), n=Number(f.get("numeroPagos")), rate=Number(f.get("valorPorMil")), calc=creditCalc(monto,rate,n), fecha=String(f.get("fecha"));
  if(calc.utilidad<0){alert("El esquema genera utilidad negativa.");return;}
  try{
    const out=await api("insert",{table:"creditos",data:{cliente_id:f.get("clienteId"),monto,frecuencia:"Diario",numero_pagos:n,valor_por_mil:rate,pago_programado:calc.pago,total_pactado:calc.total,utilidad_pactada:calc.utilidad,fecha_apertura:fecha,fecha_primer_pago:fecha,metodo_capital_utilidad:f.get("metodo"),estado:"Activo"}});
    const c=out.data;
    const dates=scheduleDates(fecha,n,"Diario");
    await api("insert",{table:"cuotas",data:dates.map((d,i)=>({credito_id:c.id,numero_pago:i+1,fecha_programada:d,importe_programado:calc.pago,importe_pagado:0,estado:"Pendiente"}))});
    await addMovement("Desembolso",-monto,`Crédito nuevo para ${clientName(c.cliente_id)}`,fecha,"credito",c.id);
    e.target.reset(); await sync();
  }catch(err){alert(err.message);}
});

function allocation(c,amount){
  const capRemain=Math.max(0,Number(c.monto)-Number(c.capital_recuperado||0));
  const utilRemain=Math.max(0,Number(c.utilidad_pactada)-Number(c.utilidad_recuperada||0));
  let capital=0, utilidad=0;
  if(c.metodo_capital_utilidad==="capitalPrimero"){
    capital=Math.min(amount,capRemain); utilidad=Math.min(amount-capital,utilRemain);
  }else{
    const ratio=Number(c.monto)/Number(c.total_pactado);
    capital=Math.min(capRemain,amount*ratio); utilidad=Math.min(utilRemain,amount-capital);
    const rest=amount-capital-utilidad;
    if(rest>0){const extraCap=Math.min(rest,capRemain-capital);capital+=extraCap;utilidad+=Math.min(rest-extraCap,utilRemain-utilidad);}
  }
  return {capital,utilidad};
}
async function applyPaymentToInstallments(c,amount){
  let left=amount;
  const qs=db.cuotas.filter(q=>q.credito_id===c.id && q.estado!=="Pagado").sort((a,b)=>a.numero_pago-b.numero_pago);
  let firstNo=qs[0]?.numero_pago||null, firstId=qs[0]?.id||null;
  for(const q of qs){
    if(left<=0)break;
    const rem=Math.max(0,Number(q.importe_programado)-Number(q.importe_pagado||0));
    const add=Math.min(left,rem);
    const paid=Number(q.importe_pagado||0)+add;
    await api("update",{table:"cuotas",id:q.id,data:{importe_pagado:paid,estado:paid+0.009>=Number(q.importe_programado)?"Pagado":"Parcial"}});
    left-=add;
  }
  return {firstNo,firstId};
}
$("formPago").addEventListener("submit",async e=>{
  e.preventDefault(); const f=new FormData(e.target), c=db.creditos.find(x=>x.id===f.get("creditoId")); if(!c)return;
  const amount=Number(f.get("monto")), date=String(f.get("fecha")), max=remainingCredit(c);
  if(amount>max+0.01){alert(`El máximo pendiente es ${money(max)}.`);return;}
  try{
    const a=allocation(c,amount), q=await applyPaymentToInstallments(c,amount);
    await api("insert",{table:"pagos",data:{credito_id:c.id,cuota_id:q.firstId,numero_pago:q.firstNo,fecha:date,monto:amount,capital:a.capital,utilidad:a.utilidad,metodo_pago:f.get("metodoPago")}});
    const newCap=Number(c.capital_recuperado||0)+a.capital, newUtil=Number(c.utilidad_recuperada||0)+a.utilidad;
    const done=newCap+newUtil+0.01>=Number(c.total_pactado);
    await api("update",{table:"creditos",id:c.id,data:{capital_recuperado:newCap,utilidad_recuperada:newUtil,estado:done?"Liquidado":c.estado}});
    await addMovement("Cobro",amount,`Pago de ${clientName(c.cliente_id)}`,date,"credito",c.id);
    e.target.reset(); await sync();
  }catch(err){alert(err.message);}
});

$("formGasto").addEventListener("submit",async e=>{
  e.preventDefault(); const f=new FormData(e.target), amount=Number(f.get("importe")), date=String(f.get("fecha"));
  try{
    const out=await api("insert",{table:"gastos",data:{fecha:date,responsable:f.get("responsable"),tipo:f.get("tipo"),concepto:f.get("concepto"),importe:amount}});
    await addMovement("Gasto",-amount,`${f.get("tipo")}: ${f.get("concepto")} · ${f.get("responsable")}`,date,"gasto",out.data.id);
    e.target.reset(); await sync();
  }catch(err){alert(err.message);}
});

window.openRenew=id=>{
  const c=db.creditos.find(x=>x.id===id); if(!c||paidInstallments(id)<18){alert("La renovación se habilita desde el pago 18.");return;}
  const form=$("formRenovar"); form.elements.creditoId.value=id; form.elements.nuevoMonto.value=c.monto; form.elements.nuevoValorPorMil.value=c.valor_por_mil; form.elements.primerPago.value=0;
  $("dialogRenovar").showModal();
};
$("confirmarRenovacion").addEventListener("click",async e=>{
  e.preventDefault(); const f=new FormData($("formRenovar")), old=db.creditos.find(x=>x.id===f.get("creditoId")); if(!old)return;
  const nuevoMonto=Number(f.get("nuevoMonto")), rate=Number(f.get("nuevoValorPorMil")), primer=Number(f.get("primerPago")||0), n=Number(old.numero_pagos||29), calc=creditCalc(nuevoMonto,rate,n), saldo=remainingCredit(old), net=nuevoMonto-saldo-primer, fecha=localToday();
  try{
    const out=await api("insert",{table:"creditos",data:{cliente_id:old.cliente_id,monto:nuevoMonto,frecuencia:old.frecuencia||"Diario",numero_pagos:n,valor_por_mil:rate,pago_programado:calc.pago,total_pactado:calc.total,utilidad_pactada:calc.utilidad,fecha_apertura:fecha,fecha_primer_pago:fecha,metodo_capital_utilidad:old.metodo_capital_utilidad,estado:"Activo",renovado_de:old.id,modalidad_renovacion:f.get("modalidad")}});
    const neu=out.data, dates=scheduleDates(fecha,n,old.frecuencia||"Diario");
    await api("insert",{table:"cuotas",data:dates.map((d,i)=>({credito_id:neu.id,numero_pago:i+1,fecha_programada:d,importe_programado:calc.pago,importe_pagado:0,estado:"Pendiente"}))});
    await api("insert",{table:"renovaciones",data:{credito_anterior_id:old.id,credito_nuevo_id:neu.id,pago_al_renovar:paidInstallments(old.id),saldo_anterior_aplicado:saldo,primer_pago_nuevo:primer,desembolso_neto:net,modalidad:f.get("modalidad")}});
    await api("update",{table:"creditos",id:old.id,data:{estado:"Renovado"}});
    if(primer>0){
      const a={capital:Math.min(primer,nuevoMonto),utilidad:Math.max(0,primer-Math.min(primer,nuevoMonto))};
      const q=db.cuotas.filter(x=>x.credito_id===old.id); // only for current local snapshot; new first cuota is not yet in db snapshot
      await api("insert",{table:"pagos",data:{credito_id:neu.id,numero_pago:1,fecha,monto:primer,capital:a.capital,utilidad:a.utilidad,observaciones:"Primer pago retenido en renovación"}});
      await api("update",{table:"creditos",id:neu.id,data:{capital_recuperado:a.capital,utilidad_recuperada:a.utilidad}});
    }
    await addMovement("Renovación",-net,`Desembolso neto de renovación de ${clientName(old.cliente_id)}`,fecha,"credito",neu.id);
    $("dialogRenovar").close(); await sync();
  }catch(err){alert(err.message);}
});

$("exportarCsv").addEventListener("click",()=>{
  const rows=[["Fecha","Tipo","Importe","Descripción"],...db.movimientos.map(m=>[m.fecha,m.tipo,m.importe,m.descripcion||""])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\\n");
  downloadText(`movimientos_socios_mas_${localToday()}.csv`,csv,"text/csv;charset=utf-8");
});
$("exportarBackup")?.addEventListener("click",()=>downloadText(`respaldo_socios_mas_cloud_${localToday()}.json`,JSON.stringify({version:5,exportedAt:new Date().toISOString(),data:db},null,2)));
function downloadText(name,text,type="application/json"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

$("formCambiarPin")?.addEventListener("submit",async e=>{
  e.preventDefault(); const f=new FormData(e.target);
  try{await api("change_pin",{oldPin:f.get("pinActual"),newPin:f.get("nuevoPin")});e.target.reset();alert("PIN actualizado.");}catch(err){alert(err.message);}
});

$("actualizarNube")?.addEventListener("click",async ()=>{
  try{await sync();}catch(err){setCloudState("error",false);alert("No se pudo actualizar: "+err.message);}
});
document.addEventListener("visibilitychange",()=>{if(!document.hidden && currentUser){sync().catch(()=>setCloudState("error",false));}});
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); $(b.dataset.tab).classList.add("active");
}));

initialize();
