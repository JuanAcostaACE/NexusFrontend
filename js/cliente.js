// Pantallas del CLIENTE (sin iniciar sesión): disponibilidad, reserva, pago, cancelación y comprobante.

// Ventana modal sencilla.
const Modal = {
  abrir(html) {
    const fondo = document.getElementById("modal");
    fondo.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <button class="cerrar" aria-label="Cerrar" id="modal-cerrar">×</button>${html}</div>`;
    fondo.hidden = false;
    fondo.onclick = (e) => { if (e.target === fondo) Modal.cerrar(); };
    document.getElementById("modal-cerrar").onclick = () => Modal.cerrar();
    return fondo.querySelector(".modal");
  },
  cerrar() { const f = document.getElementById("modal"); f.hidden = true; f.innerHTML = ""; },
};

const Cliente = {
  tipos: ["Todas", "Simple", "Doble", "Familiar", "Suite"],
  colores: ["#b8a283", "#7b867f", "#3a4944"],

  // Arco decorativo de las tarjetas de habitación.
  arco(fondo) {
    return `<svg viewBox="0 0 100 120" aria-hidden="true"><path d="M20 120V58a30 30 0 0 1 60 0v62" fill="${fondo}" stroke="#efe6d3" stroke-width="13"/></svg>`;
  },

  noches(entrada, salida) {
    return Math.max(0, Math.round((new Date(salida) - new Date(entrada)) / 86400000));
  },

  // ---------------------------------------------------------------- inicio (hero + buscador + resultados + servicios)
  async home(app) {
    app.innerHTML = `
      <section class="hero">
        <div class="hero-izq">
          <p class="sobretitulo">Estadías que inspiran</p>
          <h1>Tu próxima pausa, <em>perfectamente simple.</em></h1>
          <p>Encuentra una habitación diseñada para descansar y reserva en minutos.</p>
        </div>
        <div class="hero-der">
          <span class="marca-agua">nexus</span>
          <svg viewBox="0 0 260 270" aria-hidden="true">
            <path d="M10 270V130a120 120 0 0 1 240 0V270Z" fill="#c4a46a"/>
            <path d="M72 270V172a58 58 0 0 1 116 0V270" fill="#6b776f" stroke="#efe6d3" stroke-width="22"/>
          </svg>
        </div>
      </section>

      <section class="buscador-wrap">
        <form id="f-buscar" class="buscador">
          <label>Hotel sede *<select name="sede" required></select></label>
          <label>Llegada<input type="date" name="entrada" required min="${UI.fechaHoy(0)}" value="${UI.fechaHoy(3)}"></label>
          <label>Salida<input type="date" name="salida" required min="${UI.fechaHoy(1)}" value="${UI.fechaHoy(6)}"></label>
          <label>Habitación<select name="tipo">${this.tipos.map((t) => `<option>${t}</option>`).join("")}</select></label>
          <label>Huéspedes<select name="huespedes">
            ${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${n === 2 ? "selected" : ""}>${n} ${n === 1 ? "adulto" : "adultos"}</option>`).join("")}
          </select></label>
          <button type="submit" class="btn-dorado">Buscar</button>
        </form>
      </section>

      <section id="resultados" class="bloque"></section>

      <section id="servicios" class="bloque servicios">
        <p class="sobretitulo">Todo incluido en tu reserva</p>
        <h2>Servicios</h2>
        <div class="srv-grid">
          <div class="srv"><h3>Pago seguro con PSE</h3><p>Paga en línea y recibe la confirmación al instante.</p></div>
          <div class="srv"><h3>Comprobante con QR</h3><p>Descarga tu comprobante en PDF y preséntalo en el mostrador para el check-in.</p></div>
          <div class="srv"><h3>Restaurante y minibar</h3><p>Tus consumos se cargan a la cuenta de la habitación y se facturan al salir.</p></div>
          <div class="srv"><h3>Cancelación flexible</h3><p>Reembolso total si cancelas con más de 48 horas de anticipación.</p></div>
        </div>
      </section>`;

    const form = app.querySelector("#f-buscar");
    try {
      const sedes = await Api.get("/api/sedes");
      form.querySelector('[name="sede"]').innerHTML = UI.opciones(sedes.map((s) => ({ valor: s.id, texto: `${s.nombre}, ${s.direccion.split(",").pop().trim()}` })));
    } catch (err) {
      app.querySelector("#resultados").innerHTML = UI.error(err);
      return;
    }
    form.addEventListener("submit", (e) => { e.preventDefault(); this.buscar(app, UI.leer(form)); });
    this.buscar(app, UI.leer(form));
  },

  async buscar(app, d) {
    const out = app.querySelector("#resultados");
    out.innerHTML = `<p class="vacio">Buscando habitaciones…</p>`;
    try {
      const r = await Api.get(`/api/sedes/${d.sede}/disponibilidad?fechaEntrada=${d.entrada}&fechaSalida=${d.salida}&huespedes=${d.huespedes}`);
      let lista = r.habitaciones.slice().sort((a, b) => a.precioBase - b.precioBase);
      if (d.tipo !== "Todas") lista = lista.filter((h) => h.tipo.toLowerCase().includes(d.tipo.toLowerCase()));
      const noches = this.noches(d.entrada, d.salida);
      if (!lista.length) {
        out.innerHTML = `<div class="resultados-cab"><div><p class="sobretitulo">Sin resultados</p><h2>No encontramos habitaciones</h2></div></div>
          <p class="vacio">No hay habitaciones disponibles para los criterios seleccionados. Prueba con otras fechas o tipo de habitación.</p>`;
        return;
      }
      out.innerHTML = `
        <div class="resultados-cab">
          <div><p class="sobretitulo">${lista.length} ${lista.length === 1 ? "opción disponible" : "opciones disponibles"}</p><h2>Elige tu espacio</h2></div>
          <span class="nota-precios">Precios por ${noches} ${noches === 1 ? "noche" : "noches"}</span>
        </div>
        <div class="habs">${lista.map((h, i) => {
          const color = this.colores[i % this.colores.length];
          const titulo = /suite/i.test(h.tipo) ? h.tipo : `Habitación ${h.tipo}`;
          const etiqueta = lista.length > 1 && i === 0 ? `<span class="chip dorado">Mejor precio</span>` : `<span class="chip">Disponible</span>`;
          return `<article class="hab">
            <div class="hab-arte" style="background:${color}"><span class="num">${String(i + 1).padStart(2, "0")}</span>${this.arco(color)}</div>
            <div class="hab-info">
              ${etiqueta}
              <h3>${UI.esc(titulo)}</h3>
              <span class="meta">Hasta ${h.capacidadMax} huéspedes · Hab. ${UI.esc(h.numero)}</span>
              <div class="hab-pie">
                <span class="precio">${UI.dinero(h.precioBase * noches)}<small>COP</small></span>
                <button class="reservar" data-i="${i}">Reservar →</button>
              </div>
            </div>
          </article>`;
        }).join("")}</div>`;
      out.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () =>
        this.abrirReserva(lista[Number(b.dataset.i)], d, noches)));
    } catch (err) {
      out.innerHTML = UI.error(err);
    }
  },

  // ---------------------------------------------------------------- reserva (en ventana modal)
  abrirReserva(h, d, noches) {
    const total = h.precioBase * noches;
    const titulo = /suite/i.test(h.tipo) ? h.tipo : `Habitación ${h.tipo}`;
    const m = Modal.abrir(`
      <h2>Reservar</h2>
      <p class="subtitulo" style="margin-bottom:0">${UI.esc(titulo)} · Hab. ${UI.esc(h.numero)}</p>
      <div class="resumen">
        <div><span>Llegada</span><span>${UI.esc(d.entrada)}</span></div>
        <div><span>Salida</span><span>${UI.esc(d.salida)}</span></div>
        <div><span>Noches</span><span>${noches}</span></div>
        <div><span>Huéspedes</span><span>${UI.esc(d.huespedes)}</span></div>
        <div class="total"><span>Total</span><span>${UI.dinero(total)} COP</span></div>
      </div>
      <form id="f-reserva">
        <label>Nombre completo<input name="nombre" required></label>
        <label>Documento de identidad<input name="documento" required></label>
        <label>Correo electrónico<input type="email" name="correo" required></label>
        <button type="submit" class="btn-dorado">Confirmar reserva</button>
      </form>
      <div id="modal-msg"></div>`);
    m.querySelector("#f-reserva").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = UI.leer(e.target);
      const msg = m.querySelector("#modal-msg");
      const boton = e.target.querySelector("button");
      boton.disabled = true;
      try {
        const r = await Api.post("/api/reservas", {
          sedeId: d.sede, habitacionId: h.id, fechaEntrada: d.entrada, fechaSalida: d.salida,
          numHuespedes: Number(d.huespedes), clienteNombre: f.nombre, clienteDocumento: f.documento, clienteEmail: f.correo,
        });
        this.reservaCreada(r);
      } catch (err) {
        boton.disabled = false;
        msg.innerHTML = UI.error(err);
      }
    });
  },

  reservaCreada(r) {
    const m = Modal.abrir(`
      <h2>¡Reserva creada!</h2>
      <p class="subtitulo">Guarda tu código: lo necesitas para pagar, cancelar o descargar el comprobante.</p>
      <div class="resumen">
        <div><span>Código</span><strong>${UI.esc(r.codigo)}</strong></div>
        <div><span>Habitación</span><span>${UI.esc(r.habitacionNumero)}</span></div>
        <div><span>Estado</span><span>${UI.esc(r.estado)}</span></div>
        <div class="total"><span>Total</span><span>${UI.dinero(r.valorTotal)} COP</span></div>
      </div>
      <p class="subtitulo">La habitación queda reservada durante 15 minutos mientras completas el pago.</p>
      <div class="acciones"><button class="btn-dorado" id="ir-pago">Pagar ahora</button><button class="secundario" id="luego">Pagar después</button></div>`);
    m.querySelector("#ir-pago").addEventListener("click", () => this.pagoModal(r.codigo, r.clienteDocumento));
    m.querySelector("#luego").addEventListener("click", () => Modal.cerrar());
  },

  pagoModal(codigo, documento) {
    const m = Modal.abrir(`
      <h2>Pagar con PSE</h2>
      <p class="subtitulo">Reserva ${UI.esc(codigo)} · el resultado del pago es simulado para la demostración.</p>
      <form id="f-pago-m">
        <label>Banco<select name="banco"><option value="1007">Bancolombia</option><option value="1051">Davivienda</option></select></label>
        <label>Resultado simulado de PSE
          <select name="simulacion"><option value="APROBADO">Aprobado</option><option value="RECHAZADO">Rechazado</option><option value="PENDIENTE">Pendiente</option></select>
        </label>
        <button type="submit" class="btn-dorado">Pagar</button>
      </form>
      <div id="modal-msg"></div>`);
    m.querySelector("#f-pago-m").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = UI.leer(e.target);
      const msg = m.querySelector("#modal-msg");
      try {
        const r = await Api.post(`/api/reservas/${encodeURIComponent(codigo)}/pago`, { banco: f.banco, simulacion: f.simulacion, documento });
        const tipo = r.estadoPago === "Aprobado" ? "ok" : r.estadoPago === "Rechazado" ? "error" : "";
        msg.innerHTML = UI.resultado(`<strong>Pago ${UI.esc(r.estadoPago.toLowerCase())}</strong>${UI.esc(r.mensaje)}
          ${r.estadoPago === "Aprobado" ? `<div class="acciones"><button class="btn-dorado" id="bajar-comp">Descargar comprobante</button></div>` : ""}`, tipo);
        msg.querySelector("#bajar-comp")?.addEventListener("click", () =>
          UI.descargarPdf(`/api/reservas/${encodeURIComponent(codigo)}/comprobante?documento=${encodeURIComponent(documento)}`, `comprobante-${codigo}.pdf`)
            .catch((err) => UI.toast(err.message, "error")));
      } catch (err) { msg.innerHTML = UI.error(err); }
    });
  },

  // ---------------------------------------------------------------- mis reservas (por código)
  misReservas(app, tab = "pagar") {
    const tabs = [{ id: "pagar", t: "Pagar" }, { id: "cancelar", t: "Cancelar" }, { id: "comprobante", t: "Comprobante" }];
    app.innerHTML = `
      <p class="sobretitulo">Mis reservas</p>
      <h2 class="titulo">Gestiona tu reserva</h2>
      <p class="subtitulo">Usa el código que recibiste al reservar (por ejemplo RSV-20261201-001).</p>
      <div class="pestanas">${tabs.map((p) => `<button class="pestana ${p.id === tab ? "activa" : ""}" data-tab="${p.id}">${p.t}</button>`).join("")}</div>
      <div id="mr-contenido" class="panel"></div>`;
    app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => this.misReservas(app, b.dataset.tab)));
    const cont = app.querySelector("#mr-contenido");
    ({ pagar: () => this.pagar(cont), cancelar: () => this.cancelar(cont), comprobante: () => this.comprobante(cont) })[tab]();
  },

  pagar(cont) {
    cont.innerHTML = `
      <form id="f-pago" class="grid">
        <label>Código de la reserva<input name="codigo" required placeholder="RSV-..."></label>
        <label>Documento del huésped<input name="documento" required></label>
        <label>Resultado simulado de PSE
          <select name="simulacion"><option value="APROBADO">Aprobado</option><option value="RECHAZADO">Rechazado</option><option value="PENDIENTE">Pendiente</option></select>
        </label>
        <label>Banco<select name="banco"><option value="1007">Bancolombia</option><option value="1051">Davivienda</option></select></label>
        <button type="submit" class="btn-dorado">Pagar con PSE</button>
      </form>
      <div id="pago-resultado"></div>`;
    cont.querySelector("#f-pago").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const out = cont.querySelector("#pago-resultado");
      try {
        const r = await Api.post(`/api/reservas/${encodeURIComponent(d.codigo)}/pago`, { banco: d.banco, simulacion: d.simulacion, documento: d.documento });
        const tipo = r.estadoPago === "Aprobado" ? "ok" : r.estadoPago === "Rechazado" ? "error" : "";
        out.innerHTML = UI.resultado(`<strong>Pago ${UI.esc(r.estadoPago.toLowerCase())}</strong>${UI.esc(r.mensaje)} ${UI.dato("Reserva", r.estadoReserva)}`, tipo);
      } catch (err) { out.innerHTML = UI.error(err); }
    });
  },

  cancelar(cont) {
    cont.innerHTML = `
      <p class="subtitulo">Con más de 48 horas de anticipación el reembolso es total. Con menos, se retiene una noche.</p>
      <form id="f-canc" class="grid">
        <label>Código de la reserva<input name="codigo" required></label>
        <label>Documento del huésped<input name="documento" required></label>
        <button type="submit" class="peligro">Cancelar reserva</button>
      </form>
      <div id="canc-resultado"></div>`;
    cont.querySelector("#f-canc").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const out = cont.querySelector("#canc-resultado");
      try {
        const r = await Api.post(`/api/reservas/${encodeURIComponent(d.codigo)}/cancelar`, { documento: d.documento });
        out.innerHTML = UI.resultado(`<strong>Reserva cancelada</strong>${UI.esc(r.mensaje)}
          ${UI.dato("Política", r.politica)} ${UI.dato("Reembolso", UI.dinero(r.reembolso))} ${UI.dato("Retenido", UI.dinero(r.retenido))}`, "ok");
      } catch (err) { out.innerHTML = UI.error(err); }
    });
  },

  comprobante(cont) {
    cont.innerHTML = `
      <form id="f-comp" class="grid">
        <label>Código de la reserva<input name="codigo" required></label>
        <label>Documento del huésped<input name="documento" required></label>
        <button type="submit" class="btn-dorado">Descargar comprobante</button>
      </form>
      <div id="comp-resultado"></div>`;
    cont.querySelector("#f-comp").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const out = cont.querySelector("#comp-resultado");
      try {
        await UI.descargarPdf(`/api/reservas/${encodeURIComponent(d.codigo)}/comprobante?documento=${encodeURIComponent(d.documento)}`, `comprobante-${d.codigo}.pdf`);
        out.innerHTML = UI.resultado("<strong>Comprobante descargado</strong>Incluye el código QR para el check-in.", "ok");
      } catch (err) { out.innerHTML = UI.error(err); }
    });
  },
};
