```javascript
const STORAGE = "presenca_igreja_v1";

const SAMPLE_QR =
  "https://igreja.digital/web?MHB3Tkp0Qkh1SWxNcXJKNTltVVJBUT09";

let state = loadState();
let scanner = null;
let scannerRunning = false;
let deferredPrompt = null;


/* =========================================================
   ESTADO
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
        id: uid(),
        name: "Membro exemplo",
        qr: SAMPLE_QR,
        active: true
      }
    ],

    cultos: [
      {
        id: uid(),
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
  localStorage.setItem(
    STORAGE,
    JSON.stringify(state)
  );

  renderAll();
}


function uid() {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}


function esc(value) {
  return String(value ?? "").replace(
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
    .forEach(page =>
      page.classList.remove("active")
    );

  const page =
    document.getElementById(id);

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

  if (
    id !== "scanner" &&
    scannerRunning
  ) {
    stopScanner();
  }

  renderAll();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   TOAST
========================================================= */

function toast(
  message,
  error = false
) {
  const element =
    document.getElementById("toast");

  if (!element) return;

  element.textContent = message;

  element.className =
    "toast show" +
    (error ? " error" : "");

  setTimeout(() => {
    element.className = "toast";
  }, 3000);
}


/* =========================================================
   CULTO ATIVO
========================================================= */

function activeCulto() {
  return state.cultos.find(
    culto =>
      culto.status === "aberto"
  );
}


/* =========================================================
   RENDER GERAL
========================================================= */

function renderAll() {
  const activeMembers =
    state.members.filter(
      member => member.active
    );

  const membersCounter =
    document.getElementById(
      "statMembers"
    );

  if (membersCounter) {
    membersCounter.textContent =
      activeMembers.length;
  }


  const cultosCounter =
    document.getElementById(
      "statCultos"
    );

  if (cultosCounter) {
    cultosCounter.textContent =
      state.cultos.length;
  }


  const culto =
    activeCulto();


  const present =
    culto
      ? state.attendance.filter(
          attendance =>
            attendance.cultoId === culto.id
        ).length
      : 0;


  const presentCounter =
    document.getElementById(
      "statPresentes"
    );

  if (presentCounter) {
    presentCounter.textContent =
      present;
  }


  const absentCounter =
    document.getElementById(
      "statFaltas"
    );

  if (absentCounter) {
    absentCounter.textContent =
      Math.max(
        0,
        activeMembers.length - present
      );
  }


  const activeCultoBox =
    document.getElementById(
      "activeCultoBox"
    );


  if (activeCultoBox) {
    activeCultoBox.innerHTML =
      culto
        ? `
          <div class="culto active">

            <div>
              <h3>
                ${esc(culto.name)}
              </h3>

              <small>
                ${formatDate(culto.date)}
                às ${esc(culto.time)}
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


  const scannerSubtitle =
    document.getElementById(
      "scannerSubtitle"
    );


  if (scannerSubtitle) {
    scannerSubtitle.textContent =
      culto
        ? `${culto.name} — ${formatDate(
            culto.date
          )} às ${culto.time}`
        : "Selecione um culto ativo para começar.";
  }


  const scannerCount =
    document.getElementById(
      "scannerCount"
    );


  if (scannerCount) {
    scannerCount.textContent =
      culto
        ? state.attendance.filter(
            attendance =>
              attendance.cultoId ===
              culto.id
          ).length
        : 0;
  }
}


/* =========================================================
   DATA
========================================================= */

function formatDate(date) {
  if (!date) return "";

  return new Date(
    date + "T00:00:00"
  ).toLocaleDateString(
    "pt-BR"
  );
}


/* =========================================================
   MEMBROS
========================================================= */

function renderMembers() {
  const search =
    document.getElementById(
      "memberSearch"
    );

  const query =
    (
      search?.value || ""
    ).toLowerCase();


  const members =
    state.members.filter(
      member =>
        `${member.name} ${member.qr}`
          .toLowerCase()
          .includes(query)
    );


  const body =
    document.getElementById(
      "membersBody"
    );


  if (!body) return;


  body.innerHTML =
    members.length
      ? members
          .map(
            member => `
              <tr>

                <td>
                  <strong>
                    ${esc(member.name)}
                  </strong>
                </td>

                <td title="${esc(member.qr)}">
                  ${esc(
                    member.qr.length > 48
                      ? member.qr.slice(0, 48) +
                        "…"
                      : member.qr
                  )}
                </td>

                <td>
                  <span
                    class="pill ${
                      member.active
                        ? ""
                        : "off"
                    }"
                  >
                    ${
                      member.active
                        ? "Ativo"
                        : "Inativo"
                    }
                  </span>
                </td>

                <td>
                  <button
                    class="secondary"
                    onclick="editMember('${member.id}')"
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
  document.getElementById(
    "memberModalTitle"
  ).textContent =
    id
      ? "Editar membro"
      : "Novo membro";


  document.getElementById(
    "memberId"
  ).value =
    id || "";


  const member =
    state.members.find(
      item => item.id === id
    );


  document.getElementById(
    "memberName"
  ).value =
    member?.name || "";


  document.getElementById(
    "memberQr"
  ).value =
    member?.qr || "";


  document
    .getElementById(
      "memberModal"
    )
    .classList.remove(
      "hidden"
    );
}


function editMember(id) {
  openMemberModal(id);
}


function saveMember() {
  const id =
    document.getElementById(
      "memberId"
    ).value;


  const name =
    document
      .getElementById(
        "memberName"
      )
      .value.trim();


  const qr =
    document
      .getElementById(
        "memberQr"
      )
      .value.trim();


  if (!name || !qr) {
    return toast(
      "Informe o nome e o conteúdo do QR Code.",
      true
    );
  }


  const duplicate =
    state.members.some(
      member =>
        String(member.qr).trim() ===
          qr &&
        member.id !== id
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
        item => item.id === id
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

  toast(
    "Membro salvo."
  );
}


/* =========================================================
   CULTOS
========================================================= */

function renderCultos() {
  const list =
    document.getElementById(
      "cultosList"
    );

  if (!list) return;


  list.innerHTML =
    state.cultos
      .slice()
      .sort(
        (a, b) =>
          (
            b.date + b.time
          ).localeCompare(
            a.date + a.time
          )
      )
      .map(culto => {

        const count =
          state.attendance.filter(
            attendance =>
              attendance.cultoId ===
              culto.id
          ).length;


        return `
          <div
            class="culto ${
              culto.status === "aberto"
                ? "active"
                : ""
            }"
          >

            <div>

              <h3>
                ${esc(culto.name)}
              </h3>

              <small>
                ${formatDate(
                  culto.date
                )}
                às ${esc(
                  culto.time
                )}
                · ${count}
                presença(s)
              </small>

            </div>

            <div class="actions">

              ${
                culto.status ===
                "aberto"
                  ? `
                    <button
                      class="primary"
                      onclick="showPage('scanner')"
                    >
                      Ler QR
                    </button>

                    <button
                      class="secondary"
                      onclick="closeCulto('${culto.id}')"
                    >
                      Finalizar
                    </button>
                  `
                  : `
                    <button
                      class="secondary"
                      onclick="openCulto('${culto.id}')"
                    >
                      Abrir
                    </button>
                  `
              }

              <button
                class="ghost"
                style="background:#f4f4f4;color:#555"
                onclick="showReport('${culto.id}')"
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
  const now =
    new Date();


  document.getElementById(
    "cultoName"
  ).value = "";


  document.getElementById(
    "cultoDate"
  ).value =
    now.toISOString()
      .slice(0, 10);


  document.getElementById(
    "cultoTime"
  ).value =
    now.toTimeString()
      .slice(0, 5);


  document
    .getElementById(
      "cultoModal"
    )
    .classList.remove(
      "hidden"
    );
}


function saveCulto() {
  const name =
    document
      .getElementById(
        "cultoName"
      )
      .value.trim();


  const date =
    document.getElementById(
      "cultoDate"
    ).value;


  const time =
    document.getElementById(
      "cultoTime"
    ).value;


  if (!name || !date || !time) {
    return toast(
      "Preencha nome, data e horário.",
      true
    );
  }


  state.cultos.forEach(
    culto => {
      if (
        culto.status ===
        "aberto"
      ) {
        culto.status =
          "finalizado";
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


  closeModal(
    "cultoModal"
  );

  save();

  toast(
    "Culto criado e aberto."
  );
}


function openCulto(id) {
  state.cultos.forEach(
    culto =>
      culto.status =
        "finalizado"
  );


  const culto =
    state.cultos.find(
      item => item.id === id
    );


  if (culto) {
    culto.status = "aberto";
  }


  save();

  toast(
    "Culto aberto."
  );
}


function closeCulto(id) {
  const culto =
    state.cultos.find(
      item => item.id === id
    );


  if (culto) {
    culto.status =
      "finalizado";
  }


  save();

  toast(
    "Culto finalizado."
  );
}


/* =========================================================
   RELATÓRIOS
========================================================= */

function renderReportOptions() {
  const select =
    document.getElementById(
      "reportCulto"
    );

  if (!select) return;


  const current =
    select.value;


  select.innerHTML =
    state.cultos
      .map(
        culto => `
          <option value="${culto.id}">
            ${esc(
              culto.name
            )}
            —
            ${formatDate(
              culto.date
            )}
          </option>
        `
      )
      .join("");


  if (
    current &&
    state.cultos.some(
      culto =>
        culto.id === current
    )
  ) {
    select.value =
      current;
  } else if (
    activeCulto()
  ) {
    select.value =
      activeCulto().id;
  }
}


function renderReport() {
  const select =
    document.getElementById(
      "reportCulto"
    );


  const id =
    select?.value;


  if (!id) return;


  const culto =
    state.cultos.find(
      item => item.id === id
    );


  if (!culto) return;


  const activeMembers =
    state.members.filter(
      member => member.active
    );


  const presentIds =
    new Set(
      state.attendance
        .filter(
          attendance =>
            attendance.cultoId === id
        )
        .map(
          attendance =>
            attendance.membroId
        )
    );


  const presentes =
    activeMembers.filter(
      member =>
        presentIds.has(
          member.id
        )
    );


  const faltantes =
    activeMembers.filter(
      member =>
        !presentIds.has(
          member.id
        )
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
        member => `
          <div class="list-item">
            ✅ ${esc(
              member.name
            )}
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
        member => `
          <div class="list-item">
            ❌ ${esc(
              member.name
            )}
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
      document.getElementById(
        "reportCulto"
      );


    if (select) {
      select.value = id;
      renderReport();
    }

  }, 0);
}


/* =========================================================
   MODAIS
========================================================= */

function closeModal(id) {
  const modal =
    document.getElementById(id);

  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }
}


/* =========================================================
   MODAL DE PRESENÇA
========================================================= */

function showPresenceModal(
  member,
  already = false
) {
  const modal =
    document.getElementById(
      "presenceModal"
    );


  const title =
    document.getElementById(
      "presenceModalTitle"
    );


  const message =
    document.getElementById(
      "presenceModalMessage"
    );


  if (!modal) {
    console.error(
      "Modal de presença não encontrado no index.html"
    );

    return;
  }


  if (already) {

    if (title) {
      title.textContent =
        "Presença já registrada!";
    }


    if (message) {
      message.textContent =
        `${member.name} já possui presença neste culto.`;
    }

  } else {

    if (title) {
      title.textContent =
        "Presença confirmada!";
    }


    if (message) {
      message.textContent =
        `A presença de ${member.name} foi registrada com sucesso.`;
    }
  }


  modal.classList.remove(
    "hidden"
  );
}


function closePresenceModal() {
  const modal =
    document.getElementById(
      "presenceModal"
    );


  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }


  /*
    Depois do OK, libera
    novamente a câmera.
  */

  resumeScanner();
}


/* =========================================================
   SCANNER
========================================================= */

async function startScanner() {
  const culto =
    activeCulto();


  if (!culto) {
    return toast(
      "Crie/abra um culto antes de iniciar.",
      true
    );
  }


  if (scannerRunning) {
    return;
  }


  if (
    typeof Html5Qrcode ===
    "undefined"
  ) {
    return toast(
      "Leitor ainda carregando. Aguarde alguns segundos e tente novamente.",
      true
    );
  }


  const reader =
    document.getElementById(
      "reader"
    );


  if (!reader) {
    return;
  }


  reader.innerHTML = "";


  scanner =
    new Html5Qrcode(
      "reader"
    );


  try {

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
      Tenta encontrar a câmera traseira.
    */

    let selectedCamera =
      cameras.find(
        camera =>
          /back|rear|environment|traseira|trás/i.test(
            camera.label
          )
      );


    if (!selectedCamera) {
      selectedCamera =
        cameras[
          cameras.length - 1
        ];
    }


    const config = {

      fps: 15,

      qrbox:
        function(
          width,
          height
        ) {

          const size =
            Math.floor(
              Math.min(
                width,
                height
              ) * 0.75
            );


          return {
            width: size,
            height: size
          };
        },

      aspectRatio: 1.0,

      rememberLastUsedCamera:
        true,

      showTorchButtonIfSupported:
        true,

      experimentalFeatures: {
        useBarCodeDetectorIfSupported:
          true
      }
    };


    await scanner.start(

      selectedCamera.id,

      config,

      function(decodedText) {

        console.log(
          "QR CODE DETECTADO:",
          decodedText
        );


        /*
          IMPORTANTE:
          O scanner é pausado
          imediatamente.
        */

        pauseScanner();


        /*
          Processa o QR.
        */

        handleScan(
          dec
```
