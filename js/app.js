// Enrutador, inicio de sesión y barra de navegación.
const App = {
  rutas: {
    "": "inicio",
    "/": "inicio",
    "/login": "login",
    "/cliente": "cliente",
    "/recepcion": "recepcion",
    "/admin": "admin",
  },

  init() {
    const servidor = document.getElementById("servidor");
    servidor.value = Api.base;
    servidor.addEventListener("change", () => {
      Api.base = servidor.value;
      App.verificarServidor();
    });
    window.addEventListener("hashchange", () => this.route());
    this.verificarServidor();
    this.route();
  },

  async verificarServidor() {
    const el = document.getElementById("estadoServidor");
    try {
      const r = await fetch(Api.base + "/api/sedes");
      el.textContent = r.ok ? "● Conectado" : "● Servidor con error";
      el.className = r.ok ? "ok" : "mal";
    } catch {
      el.textContent = "● Sin conexión";
      el.className = "mal";
    }
  },

  ruta() {
    const h = (location.hash || "#/").replace(/^#/, "").split("?")[0];
    return this.rutas[h] ?? "inicio";
  },

  route() {
    const vista = this.ruta();
    const sesion = Api.sesion.get();

    // Protección de rutas del personal
    if ((vista === "recepcion" || vista === "admin") && !sesion) {
      location.hash = "#/login";
      return;
    }
    if (vista === "admin" && sesion && sesion.rol !== "Administrador") {
      location.hash = "#/recepcion";
      return;
    }
    if (vista === "recepcion" && sesion && sesion.rol === "Administrador") {
      location.hash = "#/admin";
      return;
    }
    this.pintarNav(vista, sesion);
    const app = document.getElementById("app");
    ({
      inicio: () => this.inicio(app),
      login: () => this.login(app),
      cliente: () => Cliente.render(app),
      recepcion: () => Personal.recepcion.render(app),
      admin: () => Personal.admin.render(app),
    })[vista]();
    window.scrollTo(0, 0);
  },

  pintarNav(vista, sesion) {
    const enlaces = [
      { href: "#/cliente", texto: "Cliente", v: "cliente" },
    ];
    if (sesion && sesion.rol !== "Administrador") enlaces.push({ href: "#/recepcion", texto: "Recepción", v: "recepcion" });
    if (sesion && sesion.rol === "Administrador") enlaces.push({ href: "#/admin", texto: "Administración", v: "admin" });
    document.getElementById("nav").innerHTML = enlaces.map((e) =>
      `<a href="${e.href}" class="${e.v === vista ? "activo" : ""}">${e.texto}</a>`).join("");

    const cont = document.getElementById("sesion");
    if (sesion) {
      cont.innerHTML = `<span class="etiqueta">${UI.esc(sesion.nombre)} · ${UI.esc(sesion.rol)}</span>
        <button class="secundario pequeno" id="salir">Salir</button>`;
      document.getElementById("salir").addEventListener("click", () => {
        Api.sesion.borrar();
        UI.toast("Sesión cerrada", "ok");
        location.hash = "#/";
      });
    } else {
      cont.innerHTML = `<a href="#/login" class="boton pequeno" style="color:#fff;text-decoration:none">Personal: iniciar sesión</a>`;
    }
  },

  inicio(app) {
    app.innerHTML = `
      <h1 class="titulo">Bienvenido a Nexus Hotel</h1>
      <p class="subtitulo">Elige cómo quieres entrar.</p>
      <div class="tarjetas">
        <a class="tarjeta opcion" href="#/cliente">
          <h3>Soy cliente</h3>
          <p>Consulta disponibilidad, reserva, paga con PSE, cancela o descarga tu comprobante. No necesitas cuenta.</p>
          <span class="boton">Reservar</span>
        </a>
        <a class="tarjeta opcion" href="#/login">
          <h3>Soy personal del hotel</h3>
          <p>Recepción: check-in, consumos, check-out y facturas. Administración: sedes, usuarios, inventario y reportes.</p>
          <span class="boton naranja">Iniciar sesión</span>
        </a>
      </div>`;
  },

  login(app) {
    if (Api.sesion.activa()) { location.hash = "#/" + (Api.sesion.esAdmin() ? "admin" : "recepcion"); return; }
    app.innerHTML = `
      <div class="panel login">
        <h2 class="titulo" style="font-size:1.4rem">Iniciar sesión</h2>
        <p class="subtitulo">Personal del hotel</p>
        <form id="f-login" class="grid" style="grid-template-columns:1fr">
          <label>Correo <input type="email" name="email" required autocomplete="username"></label>
          <label>Contraseña <input type="password" name="password" required autocomplete="current-password"></label>
          <button type="submit">Entrar</button>
        </form>
        <div id="login-msg" style="margin-top:14px"></div>
      </div>`;
    app.querySelector("#f-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = UI.leer(e.target);
      const msg = app.querySelector("#login-msg");
      try {
        const r = await Api.post("/api/auth/login", { email: d.email, password: d.password }, { sinToken: true });
        Api.sesion.set({ token: r.token, rol: r.rol, nombre: r.nombre, sedeId: r.sedeId });
        UI.toast(`Bienvenido, ${r.nombre}`, "ok");
        location.hash = r.rol === "Administrador" ? "#/admin" : "#/recepcion";
      } catch (err) {
        msg.innerHTML = UI.error(err);
      }
    });
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
