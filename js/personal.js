// Pantallas del PERSONAL: recepción (HU-06 a HU-12) y administración (HU-13 a HU-17).
const Personal = {

  // ---------------------------------------------------------------- RECEPCIÓN
  recepcion: {
    pestanas: [
      { id: "buscar", texto: "Buscar reserva" },
      { id: "checkin", texto: "Check-in / No-show" },
      { id: "consumos", texto: "Consumos" },
      { id: "checkout", texto: "Check-out" },
      { id: "limpieza", texto: "Limpieza" },
      { id: "factura", texto: "Factura" },
    ],

    render(el, tab = "buscar") {
      const barra = this.pestanas.map((p) =>
        `<button class="pestana ${p.id === tab ? "activa" : ""}" data-tab="${p.id}">${p.texto}</button>`).join("");
      el.innerHTML = `
        <h2 class="titulo">Recepción</h2>
        <p class="subtitulo">Solo ves las reservas y habitaciones de tu sede.</p>
        <div class="pestanas">${barra}</div>
        <div id="rec-contenido" class="panel"></div>`;
      el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => this.render(el, b.dataset.tab)));
      const cont = el.querySelector("#rec-contenido");
      ({
        buscar: () => this.buscar(cont),
        checkin: () => this.checkin(cont),
        consumos: () => this.consumos(cont),
        checkout: () => this.checkout(cont),
        limpieza: () => this.limpieza(cont),
        factura: () => this.factura(cont),
      })[tab]();
    },

    // HU-07: buscar por cédula o código de reserva.
    buscar(cont) {
      cont.innerHTML = `
        <form id="f-buscar" class="grid">
          <label>Buscar por
            <select name="tipo"><option value="cedula">Cédula</option><option value="id">Código</option></select>
          </label>
          <label>Valor <input name="valor" required placeholder="Cédula o código RSV-..."></label>
          <button type="submit">Buscar</button>
        </form>
        <div id="buscar-resultado"></div>`;
      cont.querySelector("#f-buscar").addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = UI.leer(e.target);
        const out = cont.querySelector("#buscar-resultado");
        try {
          const q = d.tipo === "cedula" ? `cedula=${encodeURIComponent(d.valor)}` : `id=${encodeURIComponent(d.valor)}`;
          const r = await Api.get(`/api/reservas/buscar?${q}`);
          out.innerHTML = UI.tabla(r.reservas, [
            { titulo: "Código", campo: "codigo" },
            { titulo: "Huésped", campo: "clienteNombre" },
            { titulo: "Hab.", campo: "habitacionNumero" },
            { titulo: "Entrada", render: (f) => UI.fecha(f.fechaEntrada) },
            { titulo: "Salida", render: (f) => UI.fecha(f.fechaSalida) },
            { titulo: "Estado", render: (f) => UI.estado(f.estado) },
            { titulo: "Total", render: (f) => UI.dinero(f.valorTotal) },
          ], r.mensaje || "No se encontraron reservas");
        } catch (err) { out.innerHTML = UI.error(err); }
      });
    },

    // HU-08: check-in (reserva Pagada) y no-show (después de las 23:59 del día de entrada).
    checkin(cont) {
      cont.innerHTML = `
        <p class="subtitulo">El check-in solo se permite con la reserva pagada y no antes de la fecha de entrada.</p>
        <form id="f-checkin" class="grid">
          <label>Código de la reserva <input name="codigo" required></label>
          <button type="submit">Registrar check-in</button>
          <button type="button" class="secundario" id="btn-noshow">Marcar No-Show</button>
        </form>
        <div id="checkin-resultado"></div>`;
      const out = cont.querySelector("#checkin-resultado");
      cont.querySelector("#f-checkin").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const r = await Api.post(`/api/reservas/${encodeURIComponent(UI.leer(e.target).codigo)}/checkin`);
          out.innerHTML = UI.resultado(`<strong>Check-in registrado</strong>${UI.dato("Estado", r.estado)}`, "ok");
        } catch (err) { out.innerHTML = UI.error(err); }
      });
      cont.querySelector("#btn-noshow").addEventListener("click", async () => {
        const codigo = cont.querySelector('[name="codigo"]').value.trim();
        try {
          await Api.post(`/api/reservas/${encodeURIComponent(codigo)}/no-show`);
          out.innerHTML = UI.resultado("<strong>Marcada como No-Show</strong>La habitación queda disponible.", "ok");
        } catch (err) { out.innerHTML = UI.error(err); }
      });
    },

    // HU-09: registrar y anular consumos en habitaciones ocupadas.
    async consumos(cont) {
      const habs = (await Api.get("/api/habitaciones")).filter((h) => h.estado === "Ocupada");
      const items = await Api.get("/api/catalogo");
      cont.innerHTML = `
        <form id="f-cons" class="grid">
          <label>Habitación ocupada <select name="hab">${UI.opciones(habs.map((h) => ({ valor: h.id, texto: "Hab. " + h.numero })))}</select></label>
          <label>Ítem <select name="item">${UI.opciones(items.map((i) => ({ valor: i.id, texto: `${i.nombre} · ${UI.dinero(i.precio)}` })))}</select></label>
          <label>Cantidad <input type="number" name="cantidad" min="1" value="1" required></label>
          <button type="submit">Registrar consumo</button>
        </form>
        <div id="cons-resultado"></div>
        <div id="cons-cuenta" class="seccion"></div>`;
      if (!habs.length) cont.querySelector("#cons-resultado").innerHTML = UI.resultado("No hay habitaciones ocupadas en tu sede.");
      const cargarCuenta = async (habId) => {
        if (!habId) return;
        const c = await Api.get(`/api/habitaciones/${habId}/consumos`);
        cont.querySelector("#cons-cuenta").innerHTML = `<h3>Cuenta · Hab. ${UI.esc(c.habitacionNumero)} · ${UI.esc(c.reservaCodigo)}</h3>` +
          UI.tabla(c.consumos, [
            { titulo: "Ítem", campo: "nombreItem" },
            { titulo: "Cant.", campo: "cantidad" },
            { titulo: "Subtotal", render: (x) => UI.dinero(x.subtotal) },
            { titulo: "Estado", render: (x) => x.anulado ? UI.estado("Cancelada") : UI.estado("Activa") },
            { titulo: "", render: (x) => x.anulado ? "" : `<button class="pequeno peligro" data-anular="${x.id}">Anular</button>` },
          ], "Sin consumos") + `<p class="subtitulo">Total activo: <strong>${UI.dinero(c.totalConsumos)}</strong></p>`;
        cont.querySelectorAll("[data-anular]").forEach((b) => b.addEventListener("click", async () => {
          const motivo = prompt("Motivo de la anulación (obligatorio):");
          if (!motivo) return;
          try {
            await Api.post(`/api/consumos/${b.dataset.anular}/anular`, { motivo });
            UI.toast("Consumo anulado y registrado en auditoría", "ok");
            cargarCuenta(habId);
          } catch (err) { UI.toast(err.message, "error"); }
        }));
      };
      cont.querySelector('[name="hab"]').addEventListener("change", (e) => cargarCuenta(e.target.value));
      cont.querySelector("#f-cons").addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = UI.leer(e.target);
        const out = cont.querySelector("#cons-resultado");
        try {
          await Api.post(`/api/habitaciones/${d.hab}/consumos`, { catalogoItemId: d.item, cantidad: Number(d.cantidad) });
          out.innerHTML = UI.resultado("Consumo registrado.", "ok");
          cargarCuenta(d.hab);
        } catch (err) { out.innerHTML = UI.error(err); }
      });
      if (habs.length) cargarCuenta(habs[0].id);
    },

    // HU-10: resumen de cuenta y confirmación del check-out (recargo si es después de las 13:00).
    async checkout(cont) {
      const habs = (await Api.get("/api/habitaciones")).filter((h) => h.estado === "Ocupada");
      cont.innerHTML = `
        <form id="f-out" class="grid">
          <label>Habitación ocupada <select name="hab">${UI.opciones(habs.map((h) => ({ valor: h.id, texto: "Hab. " + h.numero })))}</select></label>
          <button type="submit">Ver resumen de cuenta</button>
        </form>
        <div id="out-resultado"></div>`;
      const out = cont.querySelector("#out-resultado");
      cont.querySelector("#f-out").addEventListener("submit", async (e) => {
        e.preventDefault();
        const habId = UI.leer(e.target).hab;
        try {
          const r = await Api.post(`/api/habitaciones/${habId}/checkout`);
          out.innerHTML = UI.resultado(`
            <strong>Resumen · ${UI.esc(r.reservaCodigo)}</strong>
            ${UI.dato("Estadía", UI.dinero(r.costoEstadia))} ${UI.dato("Consumos", UI.dinero(r.totalConsumos))}
            ${UI.dato("Recargo salida tardía", UI.dinero(r.recargoLateCheckout))} ${UI.dato("Total", UI.dinero(r.total))}
            <p>${UI.esc(r.mensaje)}</p>
            <button id="confirmar-out">Confirmar check-out</button>`);
          out.querySelector("#confirmar-out").addEventListener("click", async () => {
            try {
              const c = await Api.post(`/api/habitaciones/${habId}/checkout?confirmar=true`);
              out.innerHTML = UI.resultado(`<strong>Check-out confirmado</strong>${UI.dato("Reserva", c.estadoReserva)} ${UI.dato("Total", UI.dinero(c.total))}`, "ok");
            } catch (err) { out.innerHTML = UI.error(err); }
          });
        } catch (err) { out.innerHTML = UI.error(err); }
      });
    },

    // HU-11: habitaciones en limpieza y su habilitación.
    async limpieza(cont) {
      const lista = await Api.get("/api/habitaciones?estado=EnLimpieza");
      cont.innerHTML = UI.tabla(lista, [
        { titulo: "Habitación", campo: "numero" },
        { titulo: "Tipo", campo: "tipo" },
        { titulo: "Estado", render: (h) => UI.estado(h.estado) },
        { titulo: "", render: (h) => `<button class="pequeno" data-hab="${h.id}">Marcar lista</button>` },
      ], "No hay habitaciones en limpieza") + `<div id="limp-resultado"></div>`;
      cont.querySelectorAll("[data-hab]").forEach((b) => b.addEventListener("click", async () => {
        try {
          await Api.post(`/api/habitaciones/${b.dataset.hab}/habilitar`);
          UI.toast("Habitación disponible", "ok");
          this.limpieza(cont);
        } catch (err) { cont.querySelector("#limp-resultado").innerHTML = UI.error(err); }
      }));
    },

    // HU-12: factura con impuestos desglosados y descarga del PDF.
    factura(cont) {
      cont.innerHTML = `
        <form id="f-fac" class="grid">
          <label>Código de la reserva <input name="codigo" required></label>
          <button type="submit">Ver factura</button>
        </form>
        <div id="fac-resultado"></div>`;
      cont.querySelector("#f-fac").addEventListener("submit", async (e) => {
        e.preventDefault();
        const codigo = UI.leer(e.target).codigo;
        const out = cont.querySelector("#fac-resultado");
        try {
          const f = await Api.get(`/api/reservas/${encodeURIComponent(codigo)}/factura`);
          const impuestos = (f.impuestosDetalle || []).map((i) =>
            UI.dato(`${i.nombre} (${Math.round(i.tasa * 100)} %)`, UI.dinero(i.valor))).join("");
          out.innerHTML = UI.resultado(`
            <strong>Factura ${UI.esc(f.numeroFactura)}</strong>
            ${UI.dato("Estadía", UI.dinero(f.subtotalEstadia))} ${UI.dato("Consumos", UI.dinero(f.subtotalConsumos))}
            ${UI.dato("Recargo", UI.dinero(f.recargoLateCheckout))}
            ${impuestos}
            ${UI.dato("Total", UI.dinero(f.total))}
            <div class="acciones"><button class="secundario" id="pdf-fac">Descargar PDF</button></div>`, "ok");
          out.querySelector("#pdf-fac").addEventListener("click", () =>
            UI.descargarPdf(`/api/reservas/${encodeURIComponent(codigo)}/factura/pdf`, `factura-${f.numeroFactura}.pdf`)
              .catch((err) => UI.toast(err.message, "error")));
        } catch (err) { out.innerHTML = UI.error(err); }
      });
    },
  },

  // ---------------------------------------------------------------- ADMINISTRACIÓN
  admin: {
    pestanas: [
      { id: "sedes", texto: "Sedes" },
      { id: "reservas", texto: "Reservas" },
      { id: "usuarios", texto: "Usuarios" },
      { id: "habitaciones", texto: "Habitaciones" },
      { id: "catalogo", texto: "Catálogo" },
      { id: "reportes", texto: "Reportes" },
    ],

    // Sede activa del administrador (Administrador.cambiarSedeActiva): la guarda el servidor y la usan
    // las pestañas de reservas, habitaciones, catálogo y reportes.
    sedeActivaId: "",
    // HU-13: por defecto se muestran todas las sedes; el administrador puede ocultar las inactivas.
    sedesVerInactivas: true,

    async render(el, tab = "sedes") {
      const barra = this.pestanas.map((p) =>
        `<button class="pestana ${p.id === tab ? "activa" : ""}" data-tab="${p.id}">${p.texto}</button>`).join("");
      el.innerHTML = `
        <h2 class="titulo">Administración</h2>
        <div id="adm-sede" class="panel" style="margin-bottom:14px"></div>
        <div class="pestanas">${barra}</div>
        <div id="adm-contenido" class="panel"></div>`;
      el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => this.render(el, b.dataset.tab)));
      const cont = el.querySelector("#adm-contenido");
      try {
        await this.pintarSedeActiva(el.querySelector("#adm-sede"), () => this.render(el, tab));
      } catch (err) { UI.toast(err.message, "error"); }
      const requiereSede = ["reservas", "habitaciones", "catalogo", "reportes"];
      if (requiereSede.includes(tab) && !this.sedeActivaId) {
        cont.innerHTML = `<p class="vacio">Elige una sede activa arriba para continuar.</p>`;
        return;
      }
      ({
        sedes: () => this.sedes(cont),
        reservas: () => this.reservas(cont),
        usuarios: () => this.usuarios(cont),
        habitaciones: () => this.habitaciones(cont),
        catalogo: () => this.catalogo(cont),
        reportes: () => this.reportes(cont),
      })[tab]();
    },

    // HU-13: selector de sede activa (se guarda en el servidor con PUT /api/admin/sede-activa).
    async pintarSedeActiva(cont, alCambiar) {
      const [sedes, activa] = await Promise.all([Api.get("/api/admin/sedes"), Api.get("/api/admin/sede-activa")]);
      this.sedeActivaId = activa.sedeId || "";
      cont.innerHTML = `
        <label style="max-width:360px">Sede activa
          <select id="sede-activa"><option value="">— Elige una sede —</option>${UI.opciones(
            sedes.map((s) => ({ valor: s.id, texto: s.nombre + (s.activa ? "" : " (inactiva)") })), this.sedeActivaId)}</select></label>
        <p class="subtitulo" style="margin:8px 0 0">Reservas, habitaciones, catálogo y reportes se muestran para esta sede.</p>`;
      cont.querySelector("#sede-activa").addEventListener("change", async (e) => {
        if (!e.target.value) return;
        try {
          await Api.put("/api/admin/sede-activa", { sedeId: e.target.value });
          UI.toast("Sede activa cambiada", "ok");
          alCambiar();
        } catch (err) { UI.toast(err.message, "error"); }
      });
    },

    // HU-13: reservas de la sede activa.
    async reservas(cont) {
      const lista = await Api.get("/api/admin/reservas");
      cont.innerHTML = `<h3>Reservas de la sede activa</h3>` + UI.tabla(lista, [
        { titulo: "Código", campo: "codigo" },
        { titulo: "Cliente", campo: "clienteNombre" },
        { titulo: "Habitación", campo: "habitacionNumero" },
        { titulo: "Entrada", campo: "fechaEntrada" },
        { titulo: "Salida", campo: "fechaSalida" },
        { titulo: "Estado", render: (r) => UI.estado(r.estado) },
      ], "No hay reservas en esta sede");
    },

    async selectorSede(cont, onCambio) {
      const sedes = await Api.get("/api/admin/sedes");
      cont.insertAdjacentHTML("afterbegin", `<label style="max-width:360px">Sede
        <select id="sede-sel">${UI.opciones(sedes.map((s) => ({ valor: s.id, texto: s.nombre + (s.activa ? "" : " (inactiva)") })))}</select></label>
        <div style="height:14px"></div>`);
      const sel = cont.querySelector("#sede-sel");
      sel.addEventListener("change", () => onCambio(sel.value));
      return sel.value;
    },

    // HU-13: listar, crear, editar y activar/inactivar sedes.
    async sedes(cont) {
      const todas = await Api.get("/api/admin/sedes");
      const lista = this.sedesVerInactivas ? todas : todas.filter((s) => s.activa);
      cont.innerHTML = `
        <h3>Sedes</h3>
        <label class="casilla" style="display:flex;align-items:center;gap:8px;max-width:360px;margin-bottom:12px">
          <input type="checkbox" id="sed-ver-inactivas" ${this.sedesVerInactivas ? "checked" : ""}>
          Mostrar sedes inactivas${this.sedesVerInactivas ? "" : ` (${todas.length - lista.length} ocultas)`}
        </label>
        ${UI.tabla(lista, [
          { titulo: "Nombre", campo: "nombre" },
          { titulo: "Dirección", campo: "direccion" },
          { titulo: "Estado", render: (s) => UI.estado(s.activa ? "Activa" : "Inactiva") },
          { titulo: "", render: (s) => `<button class="pequeno secundario" data-toggle="${s.id}" data-activa="${s.activa}">${s.activa ? "Inactivar" : "Activar"}</button>` },
        ])}
        <div class="seccion"><h3>Nueva sede</h3>
          <form id="f-sede" class="grid">
            <label>Nombre <input name="nombre" required></label>
            <label>Dirección <input name="direccion" required></label>
            <button type="submit">Crear sede</button>
          </form></div>`;
      cont.querySelector("#sed-ver-inactivas").addEventListener("change", (e) => {
        this.sedesVerInactivas = e.target.checked;
        this.sedes(cont);
      });
      cont.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
        try {
          await Api.post(`/api/admin/sedes/${b.dataset.toggle}/estado`, { activa: b.dataset.activa !== "true" });
          this.sedes(cont);
        } catch (err) { UI.toast(err.message, "error"); }
      }));
      cont.querySelector("#f-sede").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await Api.post("/api/admin/sedes", UI.leer(e.target));
          UI.toast("Sede creada", "ok");
          this.sedes(cont);
        } catch (err) { UI.toast(err.message, "error"); }
      });
    },

    // HU-14: listar usuarios (por sede), crear recepcionistas, desbloquear y dar de baja.
    async usuarios(cont) {
      const sedes = await Api.get("/api/admin/sedes");
      const pintar = async (sedeId) => {
        const lista = await Api.get(`/api/admin/usuarios${sedeId ? "?sedeId=" + sedeId : ""}`);
        cont.querySelector("#usr-tabla").innerHTML = UI.tabla(lista, [
          { titulo: "Nombre", campo: "nombre" },
          { titulo: "Correo", campo: "email" },
          { titulo: "Rol", campo: "rol" },
          { titulo: "Estado", render: (u) => UI.estado(u.bloqueado ? "Bloqueada" : u.activo ? "Activo" : "Inactivo") },
          { titulo: "", render: (u) => `
              ${u.bloqueado ? `<button class="pequeno secundario" data-desbloq="${u.id}">Desbloquear</button>` : ""}
              ${u.activo && u.rol !== "Administrador" ? `<button class="pequeno peligro" data-baja="${u.id}">Desactivar</button>` : ""}` },
        ]);
        cont.querySelectorAll("[data-desbloq]").forEach((b) => b.addEventListener("click", async () => {
          await Api.post(`/api/admin/usuarios/${b.dataset.desbloq}/desbloquear`);
          UI.toast("Cuenta desbloqueada", "ok"); pintar(sedeId);
        }));
        cont.querySelectorAll("[data-baja]").forEach((b) => b.addEventListener("click", async () => {
          if (!confirm("¿Desactivar esta cuenta? No podrá iniciar sesión.")) return;
          await Api.del(`/api/admin/usuarios/${b.dataset.baja}`);
          UI.toast("Cuenta desactivada", "ok"); pintar(sedeId);
        }));
      };
      cont.innerHTML = `
        <h3>Usuarios</h3>
        <label style="max-width:360px">Filtrar por sede
          <select id="usr-sede"><option value="">Todas las sedes</option>${UI.opciones(sedes.map((s) => ({ valor: s.id, texto: s.nombre })))}</select>
        </label>
        <div id="usr-tabla" style="margin-top:12px"></div>
        <div class="seccion"><h3>Nuevo recepcionista</h3>
          <form id="f-usr" class="grid">
            <label>Nombre <input name="nombre" required></label>
            <label>Correo <input type="email" name="email" required></label>
            <label>Contraseña inicial <input type="password" name="password" minlength="8" required></label>
            <label>Sede <select name="sedeId" required>${UI.opciones(sedes.map((s) => ({ valor: s.id, texto: s.nombre })), this.sedeActivaId)}</select></label>
            <button type="submit">Crear recepcionista</button>
          </form></div>`;
      cont.querySelector("#usr-sede").addEventListener("change", (e) => pintar(e.target.value));
      cont.querySelector("#f-usr").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await Api.post("/api/admin/usuarios", UI.leer(e.target));
          UI.toast("Recepcionista creado", "ok"); e.target.reset(); pintar(cont.querySelector("#usr-sede").value);
        } catch (err) { UI.toast(err.message, "error"); }
      });
      pintar("");
    },

    // HU-15: inventario de habitaciones por sede y cambio de estado.
    async habitaciones(cont) {
      const pintar = async (sedeId) => {
        const lista = await Api.get(`/api/habitaciones?sedeId=${sedeId}`);
        cont.querySelector("#hab-tabla").innerHTML = UI.tabla(lista, [
          { titulo: "Número", campo: "numero" },
          { titulo: "Tipo", campo: "tipo" },
          { titulo: "Capacidad", campo: "capacidadMax" },
          { titulo: "Precio base", render: (h) => UI.dinero(h.precioBase) },
          { titulo: "Estado", render: (h) => UI.estado(h.estado) },
          { titulo: "Cambiar a", render: (h) => `
              <select data-estado="${h.id}">${UI.opciones(["Disponible", "Mantenimiento"].map((x) => ({ valor: x, texto: x })), h.estado)}</select>` },
        ]);
        cont.querySelectorAll("[data-estado]").forEach((s) => s.addEventListener("change", async () => {
          try {
            const ruta = `/api/admin/habitaciones/${s.dataset.estado}/estado`;
            let r;
            try {
              r = await Api.post(ruta, { estado: s.value });
            } catch (err) {
              // Con reservas pagadas vigentes el backend pide confirmación explícita (HU-15).
              if (err.status === 409 && confirm(err.message + "\n\n¿Confirmar el cambio de todas formas?")) {
                r = await Api.post(ruta, { estado: s.value, confirmar: true });
              } else { throw err; }
            }
            UI.toast(r.reservasFuturasAfectadas ? `Estado cambiado. Hay ${r.reservasFuturasAfectadas} reserva(s) con pago vigente.` : "Estado cambiado", "ok");
            pintar(sedeId);
          } catch (err) { UI.toast(err.message, "error"); pintar(sedeId); }
        }));
      };
      cont.innerHTML = `
        <input type="hidden" id="hab-sede" value="${this.sedeActivaId}">
        <div id="hab-tabla" style="margin-top:12px"></div>
        <div class="seccion"><h3>Nueva habitación</h3>
          <form id="f-hab" class="grid">
            <label>Número <input name="numero" required></label>
            <label>Tipo <input name="tipo" required placeholder="Simple, Doble, Familiar…"></label>
            <label>Capacidad máxima <input type="number" name="capacidadMax" min="1" required></label>
            <label>Precio base <input type="number" name="precioBase" min="0" required></label>
            <button type="submit">Crear habitación</button>
          </form></div>`;
      const sedeSel = cont.querySelector("#hab-sede");
      sedeSel.addEventListener("change", () => pintar(sedeSel.value));
      cont.querySelector("#f-hab").addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = UI.leer(e.target);
        try {
          await Api.post("/api/admin/habitaciones", { ...d, sedeId: sedeSel.value, capacidadMax: Number(d.capacidadMax), precioBase: Number(d.precioBase) });
          UI.toast("Habitación creada", "ok"); e.target.reset(); pintar(sedeSel.value);
        } catch (err) { UI.toast(err.message, "error"); }
      });
      pintar(sedeSel.value);
    },

    // HU-16: catálogo de consumos por sede (activos e inactivos).
    async catalogo(cont) {
      const pintar = async (sedeId) => {
        const lista = await Api.get(`/api/admin/catalogo?sedeId=${sedeId}`);
        cont.querySelector("#cat-tabla").innerHTML = UI.tabla(lista, [
          { titulo: "Ítem", campo: "nombre" },
          { titulo: "Precio", render: (i) => UI.dinero(i.precio) },
          { titulo: "Categoría", campo: "categoria" },
          { titulo: "Estado", render: (i) => UI.estado(i.activo ? "Activo" : "Inactivo") },
          { titulo: "", render: (i) => `<button class="pequeno secundario" data-cat="${i.id}" data-activo="${i.activo}">${i.activo ? "Inactivar" : "Activar"}</button>` },
        ]);
        cont.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", async () => {
          await Api.post(`/api/admin/catalogo/${b.dataset.cat}/estado`, { activa: b.dataset.activo !== "true" });
          pintar(sedeId);
        }));
      };
      cont.innerHTML = `
        <input type="hidden" id="cat-sede" value="${this.sedeActivaId}">
        <div id="cat-tabla" style="margin-top:12px"></div>
        <div class="seccion"><h3>Nuevo ítem</h3>
          <form id="f-cat" class="grid">
            <label>Nombre <input name="nombre" required></label>
            <label>Precio <input type="number" name="precio" min="0" required></label>
            <label>Categoría <select name="categoria"><option>Restaurante</option><option>Minibar</option></select></label>
            <button type="submit">Crear ítem</button>
          </form></div>`;
      const sedeSel = cont.querySelector("#cat-sede");
      sedeSel.addEventListener("change", () => pintar(sedeSel.value));
      cont.querySelector("#f-cat").addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = UI.leer(e.target);
        try {
          await Api.post("/api/admin/catalogo", { ...d, sedeId: sedeSel.value, precio: Number(d.precio) });
          UI.toast("Ítem creado", "ok"); e.target.reset(); pintar(sedeSel.value);
        } catch (err) { UI.toast(err.message, "error"); }
      });
      pintar(sedeSel.value);
    },

    // HU-17: reportes de ocupación e ingresos por sede y rango.
    async reportes(cont) {
      cont.innerHTML = `
        <form id="f-rep" class="grid">
          <input type="hidden" name="sede" value="${this.sedeActivaId}">
          <label>Desde <input type="date" name="inicio" required value="${UI.fechaHoy(-30)}"></label>
          <label>Hasta <input type="date" name="fin" required value="${UI.fechaHoy(0)}"></label>
          <button type="submit">Generar</button>
        </form>
        <div id="rep-resultado" style="margin-top:18px"></div>`;
      cont.querySelector("#f-rep").addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = UI.leer(e.target);
        const out = cont.querySelector("#rep-resultado");
        try {
          const q = `sedeId=${d.sede}&fechaInicio=${d.inicio}&fechaFin=${d.fin}`;
          const [o, i] = await Promise.all([
            Api.get(`/api/admin/reportes/ocupacion?${q}`),
            Api.get(`/api/admin/reportes/ingresos?${q}`),
          ]);
          out.innerHTML = `
            <div class="tarjetas">
              <div class="tarjeta"><h3>Ocupación</h3>
                <p style="font-size:2rem;color:#0f4c5c;margin:0">${o.porcentajeOcupacion} %</p>
                <p>${o.nochesVendidas} de ${o.nochesDisponibles} noches</p></div>
              <div class="tarjeta"><h3>Ingresos</h3>
                <p>Estadía: ${UI.dinero(i.ingresosEstadia)}</p>
                <p>Recargo: ${UI.dinero(i.ingresosRecargoSalidaTardia)}</p>
                <p>Consumos: ${UI.dinero(i.ingresosConsumos)}</p>
                <p style="font-size:1.4rem;color:#e36414;margin:6px 0 0"><strong>${UI.dinero(i.total)}</strong></p></div>
            </div>
            ${o.mensaje ? `<p class="subtitulo">${UI.esc(o.mensaje)}</p>` : ""}`;
        } catch (err) { out.innerHTML = UI.error(err); }
      });
    },
  },
};
