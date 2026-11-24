// Enrutador, inicio de sesión y barra de navegación.
const App = {
  rutas: {
    "": "inicio",
    "/": "inicio",
    "/cliente": "inicio",
    "/servicios": "servicios",
    "/mis-reservas": "misreservas",
    "/login": "login",
    "/recepcion": "recepcion",
    "/admin": "admin",
  },

  init() {
    const servidor = document.getElementById("servidor");
    servidor.value = Api.base;
    servidor.addEventListener("change", () => {
      Api.base = servidor.value;
      App.verificarServidor();
      App.route();
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

  vistaActual() {
    const h = (location.hash || "#/").replace(/^#/, "").split("?")[0];
    return this.rutas[h] ?? "inicio";
  },

  async route() {
    const vista = this.vistaActual();
    const sesion = Api.sesion.get();
    Modal.cerrar();

    // Protección de rutas del personal
    if ((vista === "recepcion" || vista === "admin") && !sesion) { location.hash = "#/login"; return; }
    if (vista === "admin" && sesion && sesion.rol !== "Administrador") { location.hash = "#/recepcion"; return; }
    if (vista === "recepcion" && sesion && sesion.rol === "Administrador") { location.hash = "#/admin"; return; }

    this.pintarNav(vista, sesion);
    const app = document.getElementById("app");
    app.className = (vista === "inicio" || vista === "servicios") ? "" : "contenedor";

    if (vista === "inicio" || vista === "servicios") {
      await Cliente.home(app);
      if (vista === "servicios") document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo(0, 0);
      return;
    }
    ({
      misreservas: () => Cliente.misReservas(app),
      login: () => this.login(app),
      recepcion: () => Personal.recepcion.render(app),
      admin: () => Personal.admin.render(app),
    })[vista]();
    window.scrollTo(0, 0);
  },

  pintarNav(vista, sesion) {
    const enlaces = [
      { href: "#/", texto: "Habitaciones", v: "inicio" },
      { href: "#/servicios", texto: "Servicios", v: "servicios" },
      { href: "#/mis-reservas", texto: "Mis reservas", v: "misreservas" },
    ];
    if (sesion && sesion.rol !== "Administrador") enlaces.push({ href: "#/recepcion", texto: "Recepción", v: "recepcion" });
    if (sesion && sesion.rol === "Administrador") enlaces.push({ href: "#/admin", texto: "Administración", v: "admin" });
    document.getElementById("nav").innerHTML = enlaces.map((e) =>
      `<a href="${e.href}" class="${e.v === vista ? "activo" : ""}">${e.texto}</a>`).join("");

    const cont = document.getElementById("sesion");
    if (sesion) {
      cont.innerHTML = `<span class="etiqueta">${UI.esc(sesion.nombre)} · ${UI.esc(sesion.rol)}</span>
        <button class="btn-contorno" id="salir">Salir</button>`;
      document.getElementById("salir").addEventListener("click", () => {
        Api.sesion.borrar();
        UI.toast("Sesión cerrada", "ok");
        location.hash = "#/";
        App.route();
      });
    } else {
      cont.innerHTML = `<a href="#/login" class="btn-contorno">Acceso personal</a>`;
    }
  },

  login(app) {
    if (Api.sesion.activa()) { location.hash = "#/" + (Api.sesion.esAdmin() ? "admin" : "recepcion"); return; }
    app.innerHTML = `
      <div class="panel login">
        <p class="sobretitulo">Acceso personal</p>
        <h2 class="titulo" style="font-size:1.7rem">Iniciar sesión</h2>
        <p class="subtitulo">Personal de recepción y administración.</p>
        <form id="f-login" class="grid" style="grid-template-columns:1fr">
          <label>Correo<input type="email" name="email" required autocomplete="username"></label>
          <label>Contraseña<input type="password" name="password" required autocomplete="current-password"></label>
          <button type="submit" class="btn-dorado">Entrar</button>
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
