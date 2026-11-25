// Utilidades de interfaz compartidas por todas las pantallas.
const UI = {
  esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  },

  // Convierte un estado ("EnLimpieza", "Pendiente de cierre"...) en una etiqueta con color.
  estado(valor) {
    if (!valor) return "";
    const clase = String(valor).toLowerCase().replace(/[^a-záéíóúñ]/g, "");
    return `<span class="estado ${UI.esc(clase)}">${UI.esc(valor)}</span>`;
  },

  dinero(valor) {
    if (valor === null || valor === undefined || valor === "") return "–";
    return "$" + Number(valor).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  },

  fecha(valor) {
    if (!valor) return "–";
    return String(valor).slice(0, 10);
  },

  // Tabla genérica. columnas: [{ titulo, campo | render(fila) }]
  tabla(filas, columnas, mensajeVacio = "No hay registros") {
    if (!filas || filas.length === 0) return `<p class="vacio">${UI.esc(mensajeVacio)}</p>`;
    const cabecera = columnas.map((c) => `<th>${UI.esc(c.titulo)}</th>`).join("");
    const cuerpo = filas.map((f) => "<tr>" + columnas.map((c) => {
      const valor = c.render ? c.render(f) : UI.esc(f[c.campo]);
      return `<td>${valor}</td>`;
    }).join("") + "</tr>").join("");
    return `<div class="tabla-wrap"><table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
  },

  // Caja de resultado. tipo: "ok" | "error" | "" (neutro)
  resultado(html, tipo = "") {
    return `<div class="resultado ${tipo}">${html}</div>`;
  },

  dato(etiqueta, valor) {
    return `<span class="dato"><b>${UI.esc(etiqueta)}</b>${UI.esc(valor ?? "–")}</span>`;
  },

  toast(mensaje, tipo = "") {
    const t = document.getElementById("toast");
    t.textContent = mensaje;
    t.className = "toast " + tipo;
    t.hidden = false;
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  },

  // Muestra un error del backend: en pantalla o como aviso.
  error(e) {
    if (e && e.status === 401 && Api.sesion.activa()) {
      Api.sesion.borrar();
      UI.toast("Tu sesión expiró por inactividad. Vuelve a iniciar sesión.", "error");
      location.hash = "#/login";
      return "";
    }
    return UI.resultado(`<strong>No se pudo completar</strong>${UI.esc(e.message || e)}`, "error");
  },

  // Descarga un PDF que requiere sesión o no (blob) y lo abre en una pestaña nueva.
  async descargarPdf(ruta, nombre) {
    const blob = await Api.get(ruta, { blob: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  // Rellena un <select> con opciones [{valor, texto}]
  opciones(lista, valorSeleccionado = "") {
    return lista.map((o) =>
      `<option value="${UI.esc(o.valor)}" ${String(o.valor) === String(valorSeleccionado) ? "selected" : ""}>${UI.esc(o.texto)}</option>`
    ).join("");
  },

  // Lee un formulario como objeto plano (campos con name).
  leer(form) {
    const datos = {};
    new FormData(form).forEach((v, k) => { datos[k] = typeof v === "string" ? v.trim() : v; });
    return datos;
  },

  fechaHoy(sumarDias = 0) {
    const d = new Date();
    d.setDate(d.getDate() + sumarDias);
    // Fecha local: toISOString() usa UTC y en Colombia, después de las 19:00, daría el día siguiente.
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
};
