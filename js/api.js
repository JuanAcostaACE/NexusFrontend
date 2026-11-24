// Cliente HTTP del frontend: una sola función para todas las llamadas al backend.
class ApiError extends Error {
  constructor(status, mensaje, datos) {
    super(mensaje);
    this.status = status;
    this.datos = datos;
  }
}

const Api = {
  get base() {
    return localStorage.getItem("nexus.apiBase") || window.NEXUS_CONFIG.apiBase;
  },
  set base(valor) {
    localStorage.setItem("nexus.apiBase", (valor || "").trim().replace(/\/$/, ""));
  },

  sesion: {
    get() {
      try { return JSON.parse(sessionStorage.getItem("nexus.sesion")); } catch { return null; }
    },
    set(datos) { sessionStorage.setItem("nexus.sesion", JSON.stringify(datos)); },
    borrar() { sessionStorage.removeItem("nexus.sesion"); },
    esAdmin() { const s = this.get(); return !!s && s.rol === "Administrador"; },
    activa() { return !!this.get(); },
  },

  // Envía una petición. Si el backend renueva la sesión (X-Token-Renovado), guarda el nuevo token.
  async pedir(metodo, ruta, cuerpo, { blob = false, sinToken = false } = {}) {
    const cabeceras = {};
    const sesion = this.sesion.get();
    if (sesion && sesion.token && !sinToken) cabeceras["Authorization"] = "Bearer " + sesion.token;
    if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";

    let respuesta;
    try {
      respuesta = await fetch(this.base + ruta, {
        method: metodo,
        headers: cabeceras,
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      });
    } catch {
      throw new ApiError(0, "No hay conexión con el servidor. Revisa la dirección en el pie de página.");
    }

    const renovado = respuesta.headers.get("X-Token-Renovado");
    if (renovado && sesion) { sesion.token = renovado; this.sesion.set(sesion); }

    if (blob) {
      if (!respuesta.ok) throw await this._error(respuesta);
      return respuesta.blob();
    }
    const texto = await respuesta.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { /* respuesta no JSON */ }
    if (!respuesta.ok) throw this._errorDesde(respuesta.status, json, texto, respuesta.statusText);
    return json;
  },

  get(ruta, opciones) { return this.pedir("GET", ruta, undefined, opciones); },
  post(ruta, cuerpo, opciones) { return this.pedir("POST", ruta, cuerpo ?? {}, opciones); },
  put(ruta, cuerpo) { return this.pedir("PUT", ruta, cuerpo); },
  del(ruta) { return this.pedir("DELETE", ruta); },

  async _error(respuesta) {
    const texto = await respuesta.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* sin JSON */ }
    return this._errorDesde(respuesta.status, json, texto, respuesta.statusText);
  },

  _errorDesde(status, json, texto, statusText) {
    const mensaje = (json && json.mensaje) || texto || statusText || "Error";
    return new ApiError(status, mensaje, json);
  },
};
