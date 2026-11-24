// Pantallas del CLIENTE (sin iniciar sesión): HU-01 a HU-05.
const Cliente = {
  pestanas: [
    { id: "disponibilidad", texto: "Disponibilidad (HU-01)" },
    { id: "reservar", texto: "Reservar (HU-02)" },
    { id: "pagar", texto: "Pagar (HU-03)" },
    { id: "cancelar", texto: "Cancelar (HU-04)" },
    { id: "comprobante", texto: "Comprobante (HU-05)" },
  ],

  render(el, tab = "disponibilidad") {
    const barra = this.pestanas.map((p) =>
      `<button class="pestana ${p.id === tab ? "activa" : ""}" data-tab="${p.id}">${p.texto}</button>`
    ).join("");
    el.innerHTML = `
      <h2 class="titulo">Reserva tu habitación</h2>
      <p class="subtitulo">No necesitas cuenta. Guarda el código de tu reserva para pagar, cancelar o descargar el comprobante.</p>
      <div class="pestanas">${barra}</div>
      <div id="cliente-contenido" class="panel"></div>`;
    el.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => this.render(el, b.dataset.tab)));

    const cont = el.querySelector("#cliente-contenido");
    ({
      disponibilidad: () => this.disponibilidad(cont),
      reservar: () => this.reservar(cont),
      pagar: () => this.pagar(cont),
      cancelar: () => this.cancelar(cont),
      comprobante: () => this.comprobante(cont),
    })[tab]();
  },

  async sedesOpciones() {
    const sedes = await Api.get("/api/sedes");
    return UI.opciones(sedes.map((s) => ({ valor: s.id, texto: `${s.nombre} · ${s.direccion}` })));
  },

  // HU-01: consultar disponibilidad por sede y fechas.
  async disponibilidad(cont, datos = null) {
    cont.innerHTML = `
      <form id="f-disp" class="grid">
        <label>Sede <select name="sede" required>${await this.sedesOpciones()}</select></label>
        <label>Entrada <input type="date" name="entrada" required value="${UI.fechaHoy(3)}"></label>
        <label>Salida <input type="date" name="salida" required value="${UI.fechaHoy(5)}"></label>
        <label>Huéspedes <input type="number" name="huespedes" min="1" value="2" required></label>
        <button type="submit">Buscar habitaciones</button>
      </form>
      <div id="disp-resultado"></div>`;
    const res = cont.querySelector("#disp-resultado");
    const buscar = async (e) => {
      e?.preventDefault();
      const d = e ? UI.leer(e.target) : datos;
      res.innerHTML = "";
      try {
        const r = await Api.get(`/api/sedes/${d.sede}/disponibilidad?fechaEntrada=${d.entrada}&fechaSalida=${d.salida}&huespedes=${d.huespedes}`);
        if (!r.habitaciones.length) {
          res.innerHTML = UI.resultado("No hay habitaciones disponibles para los criterios seleccionados.");
          return;
        }
        res.innerHTML = `<div class="tarjetas">${r.habitaciones.map((h) => `
          <div class="tarjeta">
            <h3>Habitación ${UI.esc(h.numero)}</h3>
            <p>${UI.esc(h.tipo)} · hasta ${h.capacidadMax} huésped(es)</p>
            <p><strong style="color:#0f4c5c;font-size:1.2rem">${UI.dinero(h.precioBase)}</strong> por noche</p>
            <button class="naranja" data-reservar="${UI.esc(h.numero)}" data-sede="${UI.esc(d.sede)}"
              data-entrada="${UI.esc(d.entrada)}" data-salida="${UI.esc(d.salida)}" data-huespedes="${UI.esc(d.huespedes)}">Reservar esta</button>
          </div>`).join("")}</div>`;
        res.querySelectorAll("[data-reservar]").forEach((b) => b.addEventListener("click", () => {
          Cliente._preseleccion = { ...b.dataset, numero: b.dataset.reservar };
          document.querySelector('[data-tab="reservar"]').click();
        }));
      } catch (err) { res.innerHTML = UI.error(err); }
    };
    cont.querySelector("#f-disp").addEventListener("submit", buscar);
    if (datos) buscar();
  },

  // HU-02: registrar la reserva con datos del huésped; bloquea la habitación 15 min.
  async reservar(cont) {
    const pre = Cliente._preseleccion || {};
    Cliente._preseleccion = null;
    cont.innerHTML = `
      <p class="subtitulo">Primero elige la sede y las fechas. Luego indica la habitación y tus datos.</p>
      <form id="f-res" class="grid">
        <label>Sede <select name="sede" required>${await this.sedesOpciones()}</select></label>
        <label>Entrada <input type="date" name="entrada" required value="${pre.entrada || UI.fechaHoy(3)}"></label>
        <label>Salida <input type="date" name="salida" required value="${pre.salida || UI.fechaHoy(5)}"></label>
        <label>Huéspedes <input type="number" name="huespedes" min="1" required value="${pre.huespedes || 2}"></label>
        <label>Habitación (número) <input name="numero" required placeholder="Ej. 201" value="${pre.numero || ""}"></label>
        <label>Nombre completo <input name="nombre" required></label>
        <label>Documento de identidad <input name="documento" required></label>
        <label>Correo electrónico <input type="email" name="correo" required></label>
        <button type="submit">Confirmar reserva</button>
      </form>
      <div id="res-resultado"></div>`;
    if (pre.sede) cont.querySelector('[name="sede"]').value = pre.sede;
    cont.querySelector("#f-res").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const out = cont.querySelector("#res-resultado");
      try {
        const disp = await Api.get(`/api/sedes/${d.sede}/disponibilidad?fechaEntrada=${d.entrada}&fechaSalida=${d.salida}&huespedes=${d.huespedes}`);
        const hab = disp.habitaciones.find((h) => h.numero === d.numero);
        if (!hab) { out.innerHTML = UI.resultado("Esa habitación no está disponible para esas fechas.", "error"); return; }
        const r = await Api.post("/api/reservas", {
          sedeId: d.sede, habitacionId: hab.id, fechaEntrada: d.entrada, fechaSalida: d.salida,
          numHuespedes: Number(d.huespedes), clienteNombre: d.nombre, clienteDocumento: d.documento, clienteEmail: d.correo,
        });
        out.innerHTML = UI.resultado(`
          <strong>¡Reserva creada!</strong>
          ${UI.dato("Código", r.codigo)} ${UI.dato("Total", UI.dinero(r.valorTotal))} ${UI.dato("Estado", r.estado)}
          <p>La habitación queda reservada 15 minutos. Guarda el código para pagar.</p>
          <button class="secundario" id="ir-pagar">Ir a pagar</button>`, "ok");
        out.querySelector("#ir-pagar").addEventListener("click", () => {
          Cliente._codigo = r.codigo;
          document.querySelector('[data-tab="pagar"]').click();
        });
      } catch (err) { out.innerHTML = UI.error(err); }
    });
  },

  // HU-03: pagar con PSE (simulado).
  pagar(cont) {
    cont.innerHTML = `
      <form id="f-pago" class="grid">
        <label>Código de la reserva <input name="codigo" required value="${Cliente._codigo || ""}" placeholder="RSV-..."></label>
        <label>Resultado del pago (simulado)
          <select name="simulacion">
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
            <option value="PENDIENTE">Pendiente</option>
          </select>
        </label>
        <label>Banco <select name="banco"><option value="1007">Bancolombia (simulado)</option><option value="1051">Davivienda (simulado)</option></select></label>
        <button type="submit">Pagar con PSE</button>
      </form>
      <div id="pago-resultado"></div>`;
    cont.querySelector("#f-pago").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const out = cont.querySelector("#pago-resultado");
      try {
        const r = await Api.post(`/api/reservas/${encodeURIComponent(d.codigo)}/pago`, { banco: d.banco, simulacion: d.simulacion });
        const tipo = r.estadoPago === "Aprobado" ? "ok" : r.estadoPago === "Rechazado" ? "error" : "";
        out.innerHTML = UI.resultado(`<strong>Pago ${UI.esc(r.estadoPago)}</strong>${UI.esc(r.mensaje)}
          ${UI.dato("Reserva", r.estadoReserva)}`, tipo);
      } catch (err) { out.innerHTML = UI.error(err); }
    });
  },

  // HU-04: cancelar; la política depende de cuánto falte para el check-in.
  cancelar(cont) {
    cont.innerHTML = `
      <p class="subtitulo">Con más de 48 horas de anticipación el reembolso es total. Con menos, se retiene una noche.</p>
      <form id="f-canc" class="grid">
        <label>Código de la reserva <input name="codigo" required value="${Cliente._codigo || ""}"></label>
        <button type="submit" class="peligro">Cancelar reserva</button>
      </form>
      <div id="canc-resultado"></div>`;
    cont.querySelector("#f-canc").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const out = cont.querySelector("#canc-resultado");
      try {
        const r = await Api.post(`/api/reservas/${encodeURIComponent(d.codigo)}/cancelar`);
        out.innerHTML = UI.resultado(`<strong>Reserva cancelada</strong>${UI.esc(r.mensaje)}
          ${UI.dato("Política", r.politica)} ${UI.dato("Reembolso", UI.dinero(r.reembolso))} ${UI.dato("Retenido", UI.dinero(r.retenido))}`, "ok");
      } catch (err) { out.innerHTML = UI.error(err); }
    });
  },

  // HU-05: descargar el comprobante en PDF (solo si el pago fue aprobado).
  comprobante(cont) {
    cont.innerHTML = `
      <form id="f-comp" class="grid">
        <label>Código de la reserva <input name="codigo" required value="${Cliente._codigo || ""}"></label>
        <button type="submit">Descargar comprobante</button>
      </form>
      <div id="comp-resultado"></div>`;
    cont.querySelector("#f-comp").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const out = cont.querySelector("#comp-resultado");
      try {
        await UI.descargarPdf(`/api/reservas/${encodeURIComponent(d.codigo)}/comprobante`, `comprobante-${d.codigo}.pdf`);
        out.innerHTML = UI.resultado("<strong>Comprobante descargado</strong>Incluye el código QR para el check-in.", "ok");
      } catch (err) { out.innerHTML = UI.error(err); }
    });
  },
};
