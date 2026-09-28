const STORAGE = "presenca_igreja_v1";
const SAMPLE_QR = "https://igreja.digital/web?MHB3Tkp0Qkh1SWxNcXJKNTltVVJBUT09";

let state = loadState();
let scanner = null;
let scannerRunning = false;
let deferredPrompt = null;

function loadState(){
  const saved = localStorage.getItem(STORAGE);
  if(saved) return JSON.parse(saved);
  const now = new Date();
  const date = now.toISOString().slice(0,10);
  return {
    members: [{id: crypto.randomUUID(), name:"Membro exemplo", qr:SAMPLE_QR, active:true}],
    cultos: [{id:crypto.randomUUID(), name:"Culto de teste", date, time:"19:00", status:"aberto"}],
    attendance: []
  };
}
function save(){localStorage.setItem(STORAGE, JSON.stringify(state)); renderAll();}
function uid(){return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  if(id!=="scanner" && scannerRunning) stopScanner();
  renderAll();
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(msg,error=false){
  const el=document.getElementById("toast"); el.textContent=msg; el.className="toast show"+(error?" error":"");
  setTimeout(()=>el.className="toast",3000);
}
function activeCulto(){return state.cultos.find(c=>c.status==="aberto")}
function renderAll(){
  document.getElementById("statMembers").textContent=state.members.filter(m=>m.active).length;
  document.getElementById("statCultos").textContent=state.cultos.length;
  const c=activeCulto();
  const present=c ? state.attendance.filter(a=>a.cultoId===c.id).length : 0;
  document.getElementById("statPresentes").textContent=present;
  document.getElementById("statFaltas").textContent=Math.max(0,state.members.filter(m=>m.active).length-present);
  document.getElementById("activeCultoBox").innerHTML=c
    ? `<div class="culto active"><div><h3>${esc(c.name)}</h3><small>${formatDate(c.date)} às ${esc(c.time)}</small></div><button class="primary" onclick="showPage('scanner')">Abrir leitor</button></div>`
    : `<div class="notice">Nenhum culto aberto. Crie um culto e abra-o para iniciar a chamada.</div>`;
  renderMembers(); renderCultos(); renderReportOptions(); renderReport();
  const subtitle=document.getElementById("scannerSubtitle");
  subtitle.textContent=c ? `${c.name} — ${formatDate(c.date)} às ${c.time}` : "Selecione um culto ativo para começar.";
  document.getElementById("scannerCount").textContent=c ? state.attendance.filter(a=>a.cultoId===c.id).length : 0;
}
function formatDate(d){return d?new Date(d+"T00:00:00").toLocaleDateString("pt-BR"): ""}
function renderMembers(){
  const q=(document.getElementById("memberSearch")?.value||"").toLowerCase();
  const rows=state.members.filter(m=>`${m.name} ${m.qr}`.toLowerCase().includes(q));
  document.getElementById("membersBody").innerHTML=rows.length?rows.map(m=>`<tr>
    <td><strong>${esc(m.name)}</strong></td><td title="${esc(m.qr)}">${esc(m.qr.length>48?m.qr.slice(0,48)+"…":m.qr)}</td>
    <td><span class="pill ${m.active?"":"off"}">${m.active?"Ativo":"Inativo"}</span></td>
    <td><button class="secondary" onclick="editMember('${m.id}')">Editar</button></td>
  </tr>`).join(""):`<tr><td colspan="4">Nenhum membro encontrado.</td></tr>`;
}
function renderCultos(){
  document.getElementById("cultosList").innerHTML=state.cultos.slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).map(c=>{
    const p=state.attendance.filter(a=>a.cultoId===c.id).length;
    return `<div class="culto ${c.status==="aberto"?"active":""}">
      <div><h3>${esc(c.name)}</h3><small>${formatDate(c.date)} às ${esc(c.time)} · ${p} presença(s)</small></div>
      <div class="actions">
        ${c.status==="aberto"
          ? `<button class="primary" onclick="showPage('scanner')">Ler QR</button><button class="secondary" onclick="closeCulto('${c.id}')">Finalizar</button>`
          : `<button class="secondary" onclick="openCulto('${c.id}')">Abrir</button>`}
        <button class="ghost" style="background:#f4f4f4;color:#555" onclick="showReport('${c.id}')">Relatório</button>
      </div>
    </div>`;
  }).join("") || `<div class="card">Nenhum culto cadastrado.</div>`;
}
function renderReportOptions(){
  const sel=document.getElementById("reportCulto"); if(!sel)return;
  const current=sel.value;
  sel.innerHTML=state.cultos.map(c=>`<option value="${c.id}">${esc(c.name)} — ${formatDate(c.date)}</option>`).join("");
  if(current && state.cultos.some(c=>c.id===current)) sel.value=current;
  else if(activeCulto()) sel.value=activeCulto().id;
}
function renderReport(){
  const id=document.getElementById("reportCulto")?.value; if(!id)return;
  const c=state.cultos.find(x=>x.id===id); if(!c)return;
  const active=state.members.filter(m=>m.active);
  const ids=new Set(state.attendance.filter(a=>a.cultoId===id).map(a=>a.membroId));
  const presentes=active.filter(m=>ids.has(m.id)), faltantes=active.filter(m=>!ids.has(m.id));
  document.getElementById("reportPresentes").textContent=presentes.length;
  document.getElementById("reportFaltantes").textContent=faltantes.length;
  document.getElementById("reportPercentual").textContent=active.length?Math.round(presentes.length/active.length*100)+"%":"0%";
  document.getElementById("presentesList").innerHTML=presentes.map(m=>`<div class="list-item">✅ ${esc(m.name)}</div>`).join("")||"<p>Ninguém registrado.</p>";
  document.getElementById("faltantesList").innerHTML=faltantes.map(m=>`<div class="list-item">❌ ${esc(m.name)}</div>`).join("")||"<p>Nenhum faltante.</p>";
}
function openMemberModal(id=null){
  document.getElementById("memberModalTitle").textContent=id?"Editar membro":"Novo membro";
  document.getElementById("memberId").value=id||"";
  const m=state.members.find(x=>x.id===id);
  document.getElementById("memberName").value=m?.name||"";
  document.getElementById("memberQr").value=m?.qr||"";
  document.getElementById("memberModal").classList.remove("hidden");
}
function editMember(id){openMemberModal(id)}
function saveMember(){
  const id=document.getElementById("memberId").value, name=document.getElementById("memberName").value.trim(), qr=document.getElementById("memberQr").value.trim();
  if(!name||!qr)return toast("Informe o nome e o conteúdo do QR Code.",true);
  if(state.members.some(m=>m.qr===qr && m.id!==id))return toast("Este QR Code já está associado a outro membro.",true);
  if(id){const m=state.members.find(x=>x.id===id);m.name=name;m.qr=qr}
  else state.members.push({id:uid(),name,qr,active:true});
  closeModal("memberModal");save();toast("Membro salvo.");
}
function openCultoModal(){
  const now=new Date(); document.getElementById("cultoName").value="";
  document.getElementById("cultoDate").value=now.toISOString().slice(0,10);
  document.getElementById("cultoTime").value=now.toTimeString().slice(0,5);
  document.getElementById("cultoModal").classList.remove("hidden");
}
function saveCulto(){
  const name=document.getElementById("cultoName").value.trim(),date=document.getElementById("cultoDate").value,time=document.getElementById("cultoTime").value;
  if(!name||!date||!time)return toast("Preencha nome, data e horário.",true);
  if(state.cultos.some(c=>c.status==="aberto")) state.cultos.forEach(c=>c.status="finalizado");
  state.cultos.push({id:uid(),name,date,time,status:"aberto"});
  closeModal("cultoModal");save();toast("Culto criado e aberto.");
}
function openCulto(id){state.cultos.forEach(c=>c.status="finalizado");const c=state.cultos.find(x=>x.id===id);c.status="aberto";save();toast("Culto aberto.");}
function closeCulto(id){const c=state.cultos.find(x=>x.id===id);if(c)c.status="finalizado";save();toast("Culto finalizado.");}
function showReport(id){showPage("reports");setTimeout(()=>{document.getElementById("reportCulto").value=id;renderReport()},0)}
function closeModal(id){document.getElementById(id).classList.add("hidden")}
async function ```javascript
async function startScanner(){
  const c = activeCulto();

  if(!c){
    return toast("Crie/abra um culto antes de iniciar.", true);
  }

  if(scannerRunning){
    return;
  }

  if(typeof Html5Qrcode === "undefined"){
    return toast("Leitor ainda carregando. Aguarde alguns segundos e tente novamente.", true);
  }

  if(!window.isSecureContext){
    return toast("A câmera precisa de HTTPS para funcionar.", true);
  }

  const reader = document.getElementById("reader");

  // Limpa qualquer leitor anterior
  reader.innerHTML = "";

  scanner = new Html5Qrcode("reader");

  try {
    const config = {
      fps: 10,
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        const size = Math.floor(
          Math.min(viewfinderWidth, viewfinderHeight) * 0.70
        );

        return {
          width: size,
          height: size
        };
      },
      aspectRatio: 1.0,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE
      ],
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true
    };

    await scanner.start(
      {
        facingMode: "environment"
      },
      config,
      function(decodedText) {
        console.log("QR Code encontrado:", decodedText);
        handleScan(decodedText);
      },
      function(errorMessage) {
        // É normal aparecerem erros enquanto a câmera procura o QR Code.
      }
    );

    scannerRunning = true;

    document.getElementById("startScanner").disabled = true;
    document.getElementById("stopScanner").disabled = false;

    toast("Câmera pronta. Aponte para o QR Code.");

  } catch(error) {

    console.error("Erro ao iniciar leitor:", error);

    scannerRunning = false;

    document.getElementById("startScanner").disabled = false;
    document.getElementById("stopScanner").disabled = true;

    toast(
      "Não foi possível iniciar o leitor. Atualize a página e tente novamente.",
      true
    );
  }
}
```
{
  const c=activeCulto(); if(!c)return toast("Crie/abra um culto antes de iniciar.",true);
  if(scannerRunning)return;
  if(typeof Html5Qrcode==="undefined")return toast("Leitor ainda carregando. Tente novamente.",true);
  scanner=new Html5Qrcode("reader");
  try{
    await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:250}},decoded=>handleScan(decoded),()=>{});
    scannerRunning=true;document.getElementById("startScanner").disabled=true;document.getElementById("stopScanner").disabled=false;
  }catch(e){toast("Não foi possível abrir a câmera. Verifique a permissão do navegador.",true)}
}
async function stopScanner(){
  if(scanner&&scannerRunning){try{await scanner.stop();scanner.clear()}catch(e){}}
  scannerRunning=false;document.getElementById("startScanner").disabled=false;document.getElementById("stopScanner").disabled=true;
}
function handleScan(decoded){
  const c=activeCulto(); if(!c)return toast("Nenhum culto aberto.",true);
  const member=state.members.find(m=>m.active && m.qr===decoded);
  if(!member){
    showUnknown(decoded); return;
  }
  const already=state.attendance.some(a=>a.cultoId===c.id&&a.membroId===member.id);
  if(already){showScanResult(member,true);return}
  state.attendance.push({id:uid(),cultoId:c.id,membroId:member.id,timestamp:new Date().toISOString(),qr:decoded});
  save();showScanResult(member,false);
}
function showScanResult(member,already){
  document.getElementById("lastScan").className="last-scan";
  document.getElementById("lastScan").innerHTML=already?`⚠️ <strong>${esc(member.name)}</strong><br>Presença já registrada neste culto.`:`✅ <strong>${esc(member.name)}</strong><br>Presença registrada às ${new Date().toLocaleTimeString("pt-BR")}.`;
  const c=activeCulto();
  const items=state.attendance.filter(a=>a.cultoId===c?.id).slice(-8).reverse().map(a=>{const m=state.members.find(x=>x.id===a.membroId);return `<div class="history-item"><strong>✓ ${esc(m?.name||"Membro")}</strong>${new Date(a.timestamp).toLocaleTimeString("pt-BR")}</div>`}).join("");
  document.getElementById("scanHistory").innerHTML=items;
  document.getElementById("scannerCount").textContent=c?state.attendance.filter(a=>a.cultoId===c.id).length:0;
}
function showUnknown(decoded){
  const name=prompt("QR não cadastrado. Digite o nome do membro para cadastrar:", "");
  if(!name)return;
  if(state.members.some(m=>m.qr===decoded))return toast("Este QR já está cadastrado.",true);
  const m={id:uid(),name:name.trim(),qr:decoded,active:true};state.members.push(m);save();handleScan(decoded);
}
function registerManual(){const v=document.getElementById("manualQr").value.trim();if(!v)return toast("Cole o conteúdo do QR Code.",true);handleScan(v);document.getElementById("manualQr").value=""}
document.getElementById("startScanner").addEventListener("click",startScanner);
document.getElementById("stopScanner").addEventListener("click",stopScanner);
document.getElementById("csvInput").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{
    const lines=reader.result.split(/\r?\n/).filter(Boolean);let added=0;
    lines.slice(1).forEach(line=>{const parts=line.split(",");const name=(parts[0]||"").trim(),qr=(parts.slice(1).join(",")||"").trim();if(name&&qr&&!state.members.some(m=>m.qr===qr)){state.members.push({id:uid(),name,qr,active:true});added++}});
    save();toast(`${added} membro(s) importado(s).`);
  };reader.readAsText(file);
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;document.getElementById("installBtn").classList.remove("hidden")});
document.getElementById("installBtn").addEventListener("click",async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
renderAll();
