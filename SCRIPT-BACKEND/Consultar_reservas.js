const URL_API_SISTEMA_DE_RESERVAS = 'https://api.sheetbest.com/sheets/c7d46d40-cb83-462f-a269-9e2f2cef56c0';
let reservasCache = [];
let lastUpdate = 0; // Marca de tiempo de la última actualización
const CACHE_TIME_LIMIT = 10 * 60 * 1000; // 10 minutos de caché

// ========================== Cargar reservas desde la API ========================== //
async function cargarReservas() {
    const now = Date.now();

    // Recargar si la caché está vacía o si la última actualización fue hace más de 10 minutos
    if (reservasCache.length === 0 || now - lastUpdate > CACHE_TIME_LIMIT) {
        try {
            const response = await fetch(URL_API_SISTEMA_DE_RESERVAS);
            if (!response.ok) throw new Error('Error al cargar las reservas');

            reservasCache = await response.json();
            lastUpdate = now; // Actualizar el tiempo de la última carga
        } catch (error) {
            mostrarAlerta('Error al cargar las reservas: ' + error.message);
        }
    }
}

// ========================== Mostrar reservas en el contenedor ========================== //
function mostrarReservas(reservas, contenedor) {
    contenedor.innerHTML = ''; // Limpiar contenido anterior
    if (reservas.length > 0) {
        reservas.forEach(reserva => {
            contenedor.appendChild(crearReservaItem(reserva));
        });
    } else {
        contenedor.appendChild(crearMensaje('No hay reservas para esta sala en la fecha seleccionada.'));
    }
}

// ========================== Crear un elemento de reserva ========================== //
function crearReservaItem(reserva) {
    const table = document.createElement('table');
    table.classList.add('tabla-reservas');
    
    const tbody = document.createElement('tbody');

    const datosReserva = [
        { label: 'Fecha de Reserva:', value: reserva.Fecha_reserva },
        { label: 'Hora de Inicio:', value: reserva.Hora_inicio },
        { label: 'Hora de Fin:', value: reserva.Hora_fin },
        { label: 'Nombre del Encargado:', value: reserva.Nombre_encargado }
    ];

    datosReserva.forEach(({ label, value }) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><strong>${label}</strong></td><td>${value}</td>`;
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    return table;
}

// ========================== Crear mensajes de alerta ========================== //
function crearMensaje(texto) {
    const mensaje = document.createElement('p');
    mensaje.innerHTML = texto;
    mensaje.classList.add('mensaje');
    return mensaje;
}

// ========================== Mostrar alerta de errores ========================== //
function mostrarAlerta(mensaje) {
    const contenedor = document.getElementById('content_consultar_reservas');
    
    // Eliminar alertas anteriores
    const alertasPrevias = contenedor.getElementsByClassName('alerta');
    while (alertasPrevias.length > 0) {
        alertasPrevias[0].remove();
    }

    const alerta = document.createElement('div');
    alerta.classList.add('alerta');
    alerta.innerText = mensaje;

    // Mostrar la alerta
    alerta.style.display = 'block';
    contenedor.appendChild(alerta);
    
    // Remover la alerta después de un tiempo
    setTimeout(() => {
        alerta.remove();
    }, 3000);
}

// ========================== Obtener reservas según la selección de sala y fecha ========================== //
async function obtenerReservasPorSalaYFecha() {
    const salaSeleccionada = document.getElementById('salaSeleccionadauno').value.trim().toLowerCase();
    const fechaSeleccionada = document.getElementById('fecha_uno').value; // Obtener la fecha seleccionada
    const contentDiv = document.getElementById('content_consultar_reservas');

    if (!salaSeleccionada) {
        mostrarAlerta("Por favor, selecciona una sala.");
        return;
    }

    if (!fechaSeleccionada) {
        mostrarAlerta("Por favor, selecciona una fecha.");
        return;
    }

    let reservasDelDia = reservasCache.filter(reserva => 
        reserva.Tipo_sala.trim().toLowerCase() === salaSeleccionada && reserva.Fecha_reserva === fechaSeleccionada
    );

    mostrarReservas(reservasDelDia, contentDiv);
}

// ========================== Configuración de eventos al cargar el documento ========================== //
document.addEventListener('DOMContentLoaded', () => {
    cargarReservas(); // Cargar reservas al inicio

    const btnVer = document.getElementById('btn_ver');
    
    btnVer?.addEventListener('click', (event) => {
        event.preventDefault();
        obtenerReservasPorSalaYFecha(); // Llamar a la función para obtener reservas
    });
});