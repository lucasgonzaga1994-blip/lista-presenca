const STORAGE = "presenca_igreja_v1";

const SAMPLE_QR =
  "https://igreja.digital/web?MHB3Tkp0Qkh1SWxNcXJKNTltVVJBUT09";

let state = loadState();
let scanner = null;
let scannerRunning = false;
let deferredPrompt = null;


/* =========================================================
   ESTADO / LOCALSTORAGE
========================================================= */

function loadState() {
  const saved = localStorage.getItem(STORAGE);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    }
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  return {
    members: [
      {
        id: crypto.randomUUID(),
        name: "Membro exemplo",
        qr: SAMPLE_QR,
        active: true
      }
    ],

    cultos: [
      {
        id: crypto.randomUUID(),
        name: "Culto de teste",
        date: date,
        time: "19:00",
        status: "aberto"
      }
    ],

    attendance: []
  };
}


function save() {
  localStorage.setItem(STORAGE, JSON.stringify(state));
  renderAll();
}


function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) +
      Math.random().toString(36).slice(2);
}


function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function showPage(id) {
  document
    .querySelectorAll(".page")
    .forEach(p => p.classList.remove("active"));

  const page = document.getElementById(id);

  if (page) {
    page.classList.add("active");
  }

  document
    .querySelectorAll(".bottom-nav button")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === id
      );
    });

  if (id !== "scanner" && scannerRunning) {
    stopScanner();
  }

  renderAll();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   MENSAGENS
========================================================= */

function toast(msg, error = false) {
  const el = document.getElementById("toast");

  if (!el) return;

  el.textContent = msg;

  el.className =
    "toast show" + (error ? " error" : "");

  setTimeout(() => {
    el.className = "toast";
  }, 3000);
}


/* =========================================================
   CULTO ATIVO
========================================================= */

function activeCulto() {
  return state.cultos.find(
    c => c.status === "aberto"
  );
}


/* =========================================================
   RENDERIZAÇÃO GERAL
========================================================= */

function renderAll() {
  const activeMembers =
    state.members.filter(m => m.active);

  const membersElement =
    document.getElementById("statMembers");

  if (membersElement) {
    membersElement.textContent =
      activeMembers.length;
  }

  const cultosElement =
    document.getElementById("statCultos");

  if (cultosElement) {
    cultosElement.textContent =
      state.cultos.length;
  }

  const c = activeCulto();

  const present =
    c
      ? state.attendance.filter(
          a => a.cultoId === c.id
        ).length
      : 0;

  const presentesElement =
    document.getElementById("statPresentes");

  if (presentesElement) {
    presentesElement.textContent = present;
  }

  const faltasElement =
    document.getElementById("statFaltas");

  if (faltasElement) {
    faltasElement.textContent =
      Math.max(
        0,
        activeMembers.length - present
      );
  }


  const activeCultoBox =
    document.getElementById("activeCultoBox");

  if (activeCultoBox) {
    activeCultoBox.innerHTML = c
      ? `
        <div class="culto active">
          <div>
            <h3>${esc(c.name)}</h3>
            <small>
              ${formatDate(c.date)} às ${esc(c.time)}
            </small>
          </div>

          <button
            class="primary"
            onclick="showPage('scanner')"
          >
            Abrir leitor
          </button>
        </div>
      `
      : `
        <div class="notice">
          Nenhum culto aberto.
          Crie um culto e abra-o para iniciar a chamada.
        </div>
      `;
  }


  renderMembers();
  renderCultos();
  renderReportOptions();
  renderReport();


  const subtitle =
    document.getElementById("scannerSubtitle");

  if (subtitle) {
    subtitle.textContent = c
      ? `${c.name} — ${formatDate(c.date)} às ${c.time}`
      : "Selecione um culto ativo para começar.";
  }


  const scannerCount =
    document.getElementById("scannerCount");

  if (scannerCount) {
    scannerCount.textContent = c
      ? state.attendance.filter(
          a => a.cultoId === c.id
        ).length
      : 0;
  }
}


/* =========================================================
   DATA
========================================================= */

function formatDate(d) {
  return d
    ? new Date(d + "T00:00:00")
        .toLocaleDateString("pt-BR")
    : "";
}


/* =========================================================
   MEMBROS
========================================================= */

function renderMembers() {
  const search =
    document.getElementById("memberSearch");

  const q =
    (search?.value || "").toLowerCase();

  const rows =
    state.members.filter(m =>
      `${m.name} ${m.qr}`
        .toLowerCase()
        .includes(q)
    );

  const body =
    document.getElementById("membersBody");

  if (!body) return;

  body.innerHTML = rows.length
    ? rows
        .map(
          m => `
          <tr>

            <td>
              <strong>
                ${esc(m.name)}
              </strong>
            </td>

            <td title="${esc(m.qr)}">
              ${esc(
                m.qr.length > 48
                  ? m.qr.slice(0, 48) + "…"
                  : m.qr
              )}
            </td>

            <td>
              <span
                class="pill ${m.active ? "" : "off"}"
              >
                ${m.active ? "Ativo" : "Inativo"}
              </span>
            </td>

            <td>
              <button
                class="secondary"
                onclick="editMember('${m.id}')"
              >
                Editar
              </button>
            </td>

          </tr>
        `
        )
        .join("")
    : `
      <tr>
        <td colspan="4">
          Nenhum membro encontrado.
        </td>
      </tr>
    `;
}


function openMemberModal(id = null) {
  document.getElementById("memberModalTitle").textContent =
    id ? "Editar membro" : "Novo membro";

  document.getElementById("memberId").value =
    id || "";

  const member =
    state.members.find(
      x => x.id === id
    );

  document.getElementById("memberName").value =
    member?.name || "";

  document.getElementById("memberQr").value =
    member?.qr || "";

  document
    .getElementById("memberModal")
    .classList.remove("hidden");
}


function editMember(id) {
  openMemberModal(id);
}


function saveMember() {
  const id =
    document.getElementById("memberId").value;

  const name =
    document
      .getElementById("memberName")
      .value
      .trim();

  const qr =
    document
      .getElementById("memberQr")
      .value
      .trim();

  if (!name || !qr) {
    return toast(
      "Informe o nome e o conteúdo do QR Code.",
      true
    );
  }


  const duplicate =
    state.members.some(
      m =>
        m.qr === qr &&
        m.id !== id
    );

  if (duplicate) {
    return toast(
      "Este QR Code já está associado a outro membro.",
      true
    );
  }


  if (id) {
    const member =
      state.members.find(
        x => x.id === id
      );

    if (member) {
      member.name = name;
      member.qr = qr;
    }
  } else {
    state.members.push({
      id: uid(),
      name: name,
      qr: qr,
      active: true
    });
  }


  closeModal("memberModal");

  save();

  toast("Membro salvo.");
}


/* =========================================================
   CULTOS
========================================================= */

function renderCultos() {
  const list =
    document.getElementById("cultosList");

  if (!list) return;

  list.innerHTML =
    state.cultos
      .slice()
      .sort(
        (a, b) =>
          (b.date + b.time)
            .localeCompare(
              a.date + a.time
            )
      )
      .map(c => {

        const p =
          state.attendance.filter(
            a => a.cultoId === c.id
          ).length;

        return `
          <div
            class="culto ${
              c.status === "aberto"
                ? "active"
                : ""
            }"
          >

            <div>

              <h3>
                ${esc(c.name)}
              </h3>

              <small>
                ${formatDate(c.date)}
                às ${esc(c.time)}
                · ${p} presença(s)
              </small>

            </div>

            <div class="actions">

              ${
                c.status === "aberto"

                  ? `
                    <button
                      class="primary"
                      onclick="showPage('scanner')"
                    >
                      Ler QR
                    </button>

                    <button
                      class="secondary"
                      onclick="closeCulto('${c.id}')"
                    >
                      Finalizar
                    </button>
                  `

                  : `
                    <button
                      class="secondary"
                      onclick="openCulto('${c.id}')"
                    >
                      Abrir
                    </button>
                  `
              }

              <button
                class="ghost"
                style="background:#f4f4f4;color:#555"
                onclick="showReport('${c.id}')"
              >
                Relatório
              </button>

            </div>

          </div>
        `;
      })
      .join("")
      ||
      `
        <div class="card">
          Nenhum culto cadastrado.
        </div>
      `;
}


function openCultoModal() {
  const now = new Date();

  document.getElementById("cultoName").value = "";

  document.getElementById("cultoDate").value =
    now.toISOString().slice(0, 10);

  document.getElementById("cultoTime").value =
    now.toTimeString().slice(0, 5);

  document
    .getElementById("cultoModal")
    .classList.remove("hidden");
}


function saveCulto() {
  const name =
    document
      .getElementById("cultoName")
      .value
      .trim();

  const date =
    document.getElementById("cultoDate").value;

  const time =
    document.getElementById("cultoTime").value;

  if (!name || !date || !time) {
    return toast(
      "Preencha nome, data e horário.",
      true
    );
  }


  // Fecha qualquer culto anterior
  state.cultos.forEach(
    c => {
      if (c.status === "aberto") {
        c.status = "finalizado";
      }
    }
  );


  state.cultos.push({
    id: uid(),
    name: name,
    date: date,
    time: time,
    status: "aberto"
  });


  closeModal("cultoModal");

  save();

  toast("Culto criado e aberto.");
}


function openCulto(id) {
  state.cultos.forEach(
    c => c.status = "finalizado"
  );

  const c =
    state.cultos.find(
      x => x.id === id
    );

  if (c) {
    c.status = "aberto";
  }

  save();

  toast("Culto aberto.");
}


function closeCulto(id) {
  const c =
    state.cultos.find(
      x => x.id === id
    );

  if (c) {
    c.status = "finalizado";
  }

  save();

  toast("Culto finalizado.");
}


/* =========================================================
   RELATÓRIO
========================================================= */

function renderReportOptions() {
  const select =
    document.getElementById("reportCulto");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    state.cultos
      .map(
        c => `
          <option value="${c.id}">
            ${esc(c.name)} — ${formatDate(c.date)}
          </option>
        `
      )
      .join("");


  if (
    current &&
    state.cultos.some(
      c => c.id === current
    )
  ) {
    select.value = current;
  } else if (activeCulto()) {
    select.value =
      activeCulto().id;
  }
}


function renderReport() {
  const select =
    document.getElementById("reportCulto");

  const id =
    select?.value;

  if (!id) return;

  const c =
    state.cultos.find(
      x => x.id === id
    );

  if (!c) return;

  const activeMembers =
    state.members.filter(
      m => m.active
    );

  const ids =
    new Set(
      state.attendance
        .filter(
          a => a.cultoId === id
        )
        .map(
          a => a.membroId
        )
    );


  const presentes =
    activeMembers.filter(
      m => ids.has(m.id)
    );

  const faltantes =
    activeMembers.filter(
      m => !ids.has(m.id)
    );


  document.getElementById(
    "reportPresentes"
  ).textContent =
    presentes.length;


  document.getElementById(
    "reportFaltantes"
  ).textContent =
    faltantes.length;


  document.getElementById(
    "reportPercentual"
  ).textContent =
    activeMembers.length
      ? Math.round(
          presentes.length /
          activeMembers.length *
          100
        ) + "%"
      : "0%";


  document.getElementById(
    "presentesList"
  ).innerHTML =
    presentes
      .map(
        m =>
          `
            <div class="list-item">
              ✅ ${esc(m.name)}
            </div>
          `
      )
      .join("")
      ||
      "<p>Ninguém registrado.</p>";


  document.getElementById(
    "faltantesList"
  ).innerHTML =
    faltantes
      .map(
        m =>
          `
            <div class="list-item">
              ❌ ${esc(m.name)}
            </div>
          `
      )
      .join("")
      ||
      "<p>Nenhum faltante.</p>";
}


function showReport(id) {
  showPage("reports");

  setTimeout(() => {
    const select =
      document.getElementById("reportCulto");

    if (select) {
      select.value = id;
      renderReport();
    }
  }, 0);
}


/* =========================================================
   LEITOR QR CODE
========================================================= */

async function startScanner() {

  const c = activeCulto();

  if (!c) {
    return toast(
      "Crie/abra um culto antes de iniciar.",
      true
    );
  }


  if (scannerRunning) {
    return;
  }


  if (typeof Html5Qrcode === "undefined") {
    return toast(
      "Leitor ainda carregando. Aguarde alguns segundos e tente novamente.",
      true
    );
  }


  if (!window.isSecureContext) {
    return toast(
      "A câmera precisa de HTTPS para funcionar.",
      true
    );
  }


  const reader =
    document.getElementById("reader");

  reader.innerHTML = "";


  scanner =
    new Html5Qrcode("reader");


  try {

    /*
      Configuração mais aberta para facilitar
      a leitura de QR Codes pelo celular.
    */

    const config = {

      fps: 15,

      qrbox: function(
        viewfinderWidth,
        viewfinderHeight
      ) {

        const size =
          Math.floor(
            Math.min(
              viewfinderWidth,
              viewfinderHeight
            ) * 0.80
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

      showTorchButtonIfSupported: true,

      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };


    /*
      Primeiro tentamos descobrir
      as câmeras disponíveis.
    */

    let cameras =
      await Html5Qrcode.getCameras();


    if (
      !cameras ||
      cameras.length === 0
    ) {
      throw new Error(
        "Nenhuma câmera encontrada."
      );
    }


    /*
      Procuramos uma câmera traseira.
    */

    let selectedCamera =
      cameras.find(camera =>
        /back|rear|environment|traseira|trás/i
          .test(camera.label)
      );


    /*
      Caso o navegador não informe
      o nome da câmera, usamos a última.
    */

    if (!selectedCamera) {
      selectedCamera =
        cameras[cameras.length - 1];
    }


    console.log(
      "Câmera selecionada:",
      selectedCamera
    );


    await scanner.start(

      selectedCamera.id,

      config,

      function(decodedText) {

        console.log(
          "================================="
        );

        console.log(
          "QR CODE DETECTADO:"
        );

        console.log(
          decodedText
        );

        console.log(
          "================================="
        );


        handleScan(decodedText);
      },

      function(errorMessage) {

        /*
          Erros de tentativa de leitura
          são normais enquanto a câmera
          procura um QR Code.

          Por isso não mostramos toast
          para cada tentativa.
        */

      }
    );


    scannerRunning = true;


    document.getElementById(
      "startScanner"
    ).disabled = true;


    document.getElementById(
      "stopScanner"
    ).disabled = false;


    toast(
      "📷 Câmera pronta. Aponte para o QR Code."
    );

  } catch (error) {

    console.error(
      "Erro ao iniciar leitor:",
      error
    );


    scannerRunning = false;


    document.getElementById(
      "startScanner"
    ).disabled = false;


    document.getElementById(
      "stopScanner"
    ).disabled = true;


    toast(
      "Não foi possível iniciar o leitor. Verifique a permissão da câmera.",
      true
    );
  }
}


async function stopScanner() {

  if (
    scanner &&
    scannerRunning
  ) {

    try {

      await scanner.stop();

      scanner.clear();

    } catch (e) {

      console.error(
        "Erro ao parar câmera:",
        e
      );
    }
  }


  scannerRunning = false;


  const startButton =
    document.getElementById(
      "startScanner"
    );

  const stopButton =
    document.getElementById(
      "stopScanner"
    );


  if (startButton) {
    startButton.disabled = false;
  }

  if (stopButton) {
    stopButton.disabled = true;
  }
}


/* =========================================================
   PROCESSAMENTO DO QR CODE
========================================================= */

function handleScan(decoded) {

  const c = activeCulto();


  if (!c) {
    return toast(
      "Nenhum culto aberto.",
      true
    );
  }


  /*
    O conteúdo que realmente veio
    do QR Code.
  */

  const qrLido =
    String(decoded)
      .trim();


  console.log(
    "QR LIDO:",
    qrLido
  );


  /*
    Procura o membro cadastrado.
  */

  const member =
    state.members.find(
      m =>
        m.active &&
        String(m.qr).trim() === qrLido
    );


  /*
    QR ainda não cadastrado.
  */

  if (!member) {

    showUnknown(qrLido);

    return;
  }


  /*
    Verifica se a pessoa
    já foi registrada neste culto.
  */

  const already =
    state.attendance.some(
      a =>
        a.cultoId === c.id &&
        a.membroId === member.id
    );


  if (already) {

    showScanResult(
      member,
      true
    );

    toast(
      `⚠️ ${member.name} já está presente.`
    );

    return;
  }


  /*
    Registra a presença.
  */

  state.attendance.push({

    id: uid(),

    cultoId: c.id,

    membroId: member.id,

    timestamp:
      new Date().toISOString(),

    qr: qrLido

  });


  save();


  /*
    Mostra o resultado na tela.
  */

  showScanResult(
    member,
    false
  );


  /*
    Mostra também o aviso rápido.
  */

  toast(
    `✅ Presença registrada: ${member.name}`
  );
}


/* =========================================================
   RESULTADO DA LEITURA
========================================================= */

function showScanResult(
  member,
  already
) {

  const box =
    document.getElementById(
      "lastScan"
    );


  if (!box) return;


  box.className =
    "last-scan";


  if (already) {

    box.innerHTML = `
      ⚠️
      <strong>
        ${esc(member.name)}
      </strong>
      <br>
      Presença já registrada neste culto.
    `;

  } else {

    box.innerHTML = `
      ✅
      <strong>
        ${esc(member.name)}
      </strong>
      <br>
      Presença registrada às
      ${new Date().toLocaleTimeString("pt-BR")}.
    `;
  }


  const c =
    activeCulto();


  const items =
    state.attendance
      .filter(
        a =>
          a.cultoId === c?.id
      )
      .slice(-8)
      .reverse()
      .map(a => {

        const m =
          state.members.find(
            x =>
              x.id === a.membroId
          );


        return `
          <div class="history-item">

            <strong>
              ✓
              ${esc(
                m?.name || "Membro"
              )}
            </strong>

            ${new Date(
              a.timestamp
            ).toLocaleTimeString(
              "pt-BR"
            )}

          </div>
        `;
      })
      .join("");


  document.getElementById(
    "scanHistory"
  ).innerHTML =
    items;


  document.getElementById(
    "scannerCount"
  ).textContent =
    c
      ? state.attendance.filter(
          a =>
            a.cultoId === c.id
        ).length
      : 0;
}


/* =========================================================
   QR NÃO CADASTRADO
========================================================= */

function showUnknown(decoded) {

  /*
    Mostra exatamente que o QR foi
    encontrado, mas ainda não está
    associado a um membro.
  */

  const name =
    prompt(
      "QR Code lido com sucesso!\n\n" +
      "Este QR ainda não está cadastrado.\n\n" +
      "Digite o nome do membro:",
      ""
    );


  /*
    Usuário cancelou.
  */

  if (
    !name ||
    !name.trim()
  ) {

    toast(
      "Cadastro cancelado.",
      true
    );

    return;
  }


  /*
    Verifica novamente se o QR
    já existe.
  */

  if (
    state.members.some(
      m =>
        String(m.qr).trim() === decoded
    )
  ) {

    toast(
      "Este QR Code já está cadastrado.",
      true
    );

    return;
  }


  /*
    Cria o membro.
  */

  const member = {

    id: uid(),

    name: name.trim(),

    qr: decoded,

    active: true
  };


  state.members.push(
    member
  );


  save();


  /*
    IMPORTANTE:
    Depois de cadastrar, registra
    a presença automaticamente.
  */

  handleScan(decoded);
}


/* =========================================================
   CADASTRO MANUAL
========================================================= */

function registerManual() {

  const input =
    document.getElementById(
      "manualQr"
    );


  const value =
    input.value.trim();


  if (!value) {

    return toast(
      "Cole o conteúdo do QR Code.",
      true
    );
  }


  handleScan(value);


  input.value = "";
}


/* =========================================================
   MODAIS
========================================================= */

function closeModal(id) {

  const modal =
    document.getElementById(id);


  if (modal) {
    modal.classList.add("hidden");
  }
}


/* =========================================================
   IMPORTAÇÃO CSV
========================================================= */

document
  .getElementById("csvInput")
  ?.addEventListener(
    "change",
    e => {

      const file =
        e.target.files[0];


      if (!file) return;


      const reader =
        new FileReader();


      reader.onload = () => {

        const lines =
          reader.result
            .split(/\r?\n/)
            .filter(Boolean);


        let added = 0;


        lines
          .slice(1)
          .forEach(line => {

            const parts =
              line.split(",");


            const name =
              (parts[0] || "")
                .trim();


            const qr =
              (
                parts
                  .slice(1)
                  .join(",") ||
                ""
              ).trim();


            if (
              name &&
              qr &&
              !state.members.some(
                m => m.qr === qr
              )
            ) {

              state.members.push({

                id: uid(),

                name: name,

                qr: qr,

                active: true

              });


              added++;
            }
          });


        save();


        toast(
          `${added} membro(s) importado(s).`
        );
      };


      reader.readAsText(file);
    }
  );


/* =========================================================
   PWA - INSTALAÇÃO
========================================================= */

window.addEventListener(
  "beforeinstallprompt",
  e => {

    e.preventDefault();

    deferredPrompt = e;


    const installBtn =
      document.getElementById(
        "installBtn"
      );


    if (installBtn) {
      installBtn.classList.remove(
        "hidden"
      );
    }
  }
);


document
  .getElementById("installBtn")
  ?.addEventListener(
    "click",
    async () => {

      if (!deferredPrompt) return;


      deferredPrompt.prompt();


      deferredPrompt = null;
    }
  );


/* =========================================================
   SERVICE WORKER
========================================================= */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "service-worker.js"
        )
        .catch(
          error =>
            console.error(
              "Erro no Service Worker:",
              error
            )
        );
    }
  );
}


/* =========================================================
   BOTÕES
========================================================= */

document
  .getElementById("startScanner")
  ?.addEventListener(
    "click",
    startScanner
  );


document
  .getElementById("stopScanner")
  ?.addEventListener(
    "click",
    stopScanner
  );


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

renderAll();