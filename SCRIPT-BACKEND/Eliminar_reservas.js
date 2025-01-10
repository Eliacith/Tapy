import { obtenerReservas, mostrarAlerta } from './Registrar_reservas.js';

let reservasCache = null; // Variable de caché
let cacheTimestamp = null; // Marca de tiempo para la caché
let ultimaSincronizacion = null; // Marca de tiempo para la última sincronización
const API_URL = 'hhttps://api.sheetbest.com/sheets/c7d46d40-cb83-462f-a269-9e2f2cef56c0';
const CACHE_EXPIRATION_TIME = 300000; // 5 minutos de expiración de caché
const TIEMPO_MINIMO_SINCRONIZACION = 30000; // 30 segundos entre sincronizaciones

// ========================== Función para obtener reservas con caché ========================== //
async function obtenerReservasCaching() {
    const ahora = Date.now();
    // Si no hay datos en caché o si los datos están desactualizados, obtenemos los datos de la API
    if (!reservasCache || (ahora - cacheTimestamp) > CACHE_EXPIRATION_TIME) {
        reservasCache = await obtenerReservas(); // Carga y almacena en caché
        cacheTimestamp = ahora; // Actualiza la marca de tiempo
    }
    return reservasCache; // Devuelve los datos en caché si ya están disponibles
}

// ========================== Función para eliminar reservas ========================== //
async function eliminarReserva() {
    const formularioDos = document.getElementById('formulario_dos');
    if (!formularioDos) {
        console.error("No se encontró el formulario para eliminar la reserva");
        return;
    }

    formularioDos.addEventListener('submit', handleFormSubmit);
}

// ========================== Manejar la lógica del formulario de eliminación ========================== //
async function handleFormSubmit(e) {
    e.preventDefault();

    const codigoReserva = obtenerCodigoReserva();
    if (!codigoReserva) return;

    const reservasExistentes = await obtenerReservasCaching(); // Usa la función de caché

    // Busca la reserva usando el código proporcionado (normalizando el código antes de la comparación)
    const reservaEncontrada = reservasExistentes.find(reserva => normalizarCodigo(reserva.Codigo_reserva) === normalizarCodigo(codigoReserva));

    if (!reservaEncontrada) {
        mostrarAlertaConMensaje('Código de reserva no encontrado.', 'error');
        return;
    }

    const confirmar = await mostrarAlertaConfirmacion();

    if (confirmar) {
        const numeroFila = reservasExistentes.indexOf(reservaEncontrada); 
        const resultadoEliminacion = await eliminarReservaDesdeAPI(numeroFila);

        if (resultadoEliminacion) {
            mostrarAlertaConMensaje('Reserva eliminada con éxito.', 'success');
            // Invalida la caché, ya que la reserva ha sido eliminada
            reservasCache = null; 
            await sincronizarTablaExcel(); // Solo sincronizamos después de la eliminación
            refrescarPagina(); // Llama la función para refrescar la página después de eliminar la reserva
        } else {
            mostrarAlertaConMensaje('No se pudo eliminar la reserva.', 'error', true);
        }
    } else {
        mostrarAlertaConMensaje('Operación cancelada.', 'info', true);
    }
}

// ========================== Función para obtener el código de reserva ========================== //
function obtenerCodigoReserva() {
    const digitos = [
        document.getElementById('digito1').value,
        document.getElementById('digito2').value,
        document.getElementById('digito3').value,
        document.getElementById('digito4').value
    ];

    if (digitos.some(d => !d)) {
        mostrarAlertaConMensaje('Por favor, complete todos los campos.');
        return null;
    }

    if (!digitos.every(d => /^\d{1}$/.test(d))) {
        mostrarAlertaConMensaje('Por favor, ingresa solo dígitos en los cuatro campos.');
        return null;
    }

    const codigoReserva = digitos.join('');
    document.getElementById('resultado').textContent = `Código ingresado: ${codigoReserva}`;
    return codigoReserva;
}

// ========================== Mostrar alerta de confirmación ========================== //
async function mostrarAlertaConfirmacion() {
    return new Promise(resolve => {
        const alerta = document.getElementById('alertaconfirmacion');
        const btnConfirmar = document.getElementById('btnConfirmar');
        const btnCancelar = document.getElementById('btnCancelar');

        if (!alerta || !btnConfirmar || !btnCancelar) {
            console.error('Elementos necesarios para mostrar la alerta no se encontraron en el DOM.');
            resolve(false);
            return;
        }

        alerta.style.display = "grid";

        btnConfirmar.onclick = () => handleConfirmalerta(alerta, resolve, true);
        btnCancelar.onclick = () => handleConfirmalerta(alerta, resolve, false);
    });
}

// ========================== Manejar la confirmación de la alerta ========================== //
function handleConfirmalerta(alerta, resolve, result) {
    alerta.style.display = "none"; // Ocultar alerta
    resolve(result); // Resolver la promesa con TRUE o FALSE
}

// ========================== Mostrar alerta con mensaje ========================== //
function mostrarAlertaConMensaje(mensaje, tipo = 'info', necesidad = false) {
    mostrarAlerta(mensaje, tipo, necesidad); // Usar función de alerta de 'Registrar_reservas.js'
}

// ========================== Eliminar reserva desde la API ========================== //
async function eliminarReservaDesdeAPI(numeroFila) {
    const url = `${API_URL}/${numeroFila}`;

    try {
        const respuesta = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!respuesta.ok) {
            const errorDetails = await respuesta.json();
            mostrarAlerta(`Error al eliminar la reserva: ${errorDetails.message || "Error desconocido"}`, "error", true);
            return false;
        }

        return true;
    } catch (error) {
        mostrarAlerta("Hubo un problema al eliminar la reserva. Por favor, inténtelo de nuevo.", "error", true);
        return false;
    }
}

// ========================== Sincronizar estado de la tabla de Excel ========================== //
async function sincronizarTablaExcel() {
    const ahora = Date.now();

    // Solo sincronizamos si ha pasado el tiempo mínimo desde la última sincronización
    if (ultimaSincronizacion && (ahora - ultimaSincronizacion) < TIEMPO_MINIMO_SINCRONIZACION) {
        // Evitar múltiples sincronizaciones en poco tiempo
        return;
    }

    ultimaSincronizacion = ahora;

    // Intentar realizar la sincronización
    await realizarSincronizacionConReintento(3); // Intentar hasta 3 veces en caso de error
}

// ========================== Intentar sincronización con reintentos ========================== //
async function realizarSincronizacionConReintento(maxIntentos) {
    const url = API_URL;
    let intentos = 0;
    let exitoso = false;

    while (intentos < maxIntentos && !exitoso) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorDetails = await response.json();
                mostrarAlerta(`Error al sincronizar con la tabla de Excel: ${errorDetails.message || "Error desconocido"}`, "error", true);
                intentos++;
                continue; // Volver a intentar
            }

            const reservasActualizadas = await response.json();
            // Aquí puedes procesar las reservas actualizadas según sea necesario
            exitoso = true; // Si hemos llegado aquí, la sincronización fue exitosa
            // Actualizar caché si es necesario
            reservasCache = reservasActualizadas; // Opcional: Actualiza la caché con datos más recientes
            cacheTimestamp = Date.now(); // Actualizar la marca de tiempo de caché
        } catch (error) {
            mostrarAlerta("Hubo un problema al sincronizar con la tabla de Excel. Por favor, inténtelo de nuevo.", "error", true);
            intentos++;
        }
    }
}

// ========================== Función para recargar la página ========================== //
function refrescarPagina() {
    setTimeout(() => {
        window.location.reload(); // Refresca la página después de un retraso
    }, 3000); // 3 segundos de retraso
}

// ========================== Normalizar código de reserva ========================== //
function normalizarCodigo(codigo) {
    // Normaliza el código de reserva a un formato estándar (elimina espacios y pasa a mayúsculas)
    return codigo.trim().toUpperCase(); // Asumimos que el código es insensible a mayúsculas y espacios
}

// ========================== Inicialización cuando el DOM esté listo ========================== //
document.addEventListener('DOMContentLoaded', () => {
    eliminarReserva(); // Inicializa la funcionalidad de eliminar reservas
});