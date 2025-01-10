// ========================== Constantes y Configuraciones ========================== //
const API_URL = 'https://api.sheetbest.com/sheets/c7d46d40-cb83-462f-a269-9e2f2cef56c0';

// Variable para almacenar las reservas en caché
let cachedReservas = [];
let lastFetched = 0; // Timestamp de la última actualización de la caché
const CACHE_EXPIRATION_TIME = 300000; // 5 minutos

// Carga inicial de reservas
(async () => {
    await obtenerReservas();
    setInterval(obtenerReservas, CACHE_EXPIRATION_TIME);
})();

// ========================== Funciones de Alertas ========================== //
export function mostrarAlerta(mensaje, tipo, mostrarContinuar) {
    const alerta = document.createElement('div');
    alerta.classList.add('alerta', tipo);
    alerta.textContent = mensaje;

    if (mostrarContinuar) {
        const continuarBtn = document.createElement('button');
        continuarBtn.textContent = 'Continuar';
        continuarBtn.classList.add('continuar');
        continuarBtn.onclick = () => {
            alerta.style.display = 'none';
        };
        alerta.appendChild(continuarBtn);
    }

    document.body.appendChild(alerta);
    alerta.style.display = 'grid';

    if (!mostrarContinuar) {
        setTimeout(() => {
            alerta.style.display = 'none';
        }, 3000);
    }
}

// ========================== Funciones de API ========================== //
export async function obtenerReservas() {
    const now = Date.now();

    // Verificamos si necesitamos refrescar la caché
    if (cachedReservas.length && (now - lastFetched < CACHE_EXPIRATION_TIME)) {
        return cachedReservas; // Retorna las reservas de la caché si son recientes
    }

    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) {
            const errorDetails = await respuesta.text();
            throw new Error(`Error al obtener las reservas. Código de estado: ${respuesta.status}, Detalles: ${errorDetails}`);
        }

        const data = await respuesta.json();

        if (!Array.isArray(data)) {
            throw new Error('La respuesta no es un array de reservas.');
        }

        // Almacenamos todas las reservas recibidas
        cachedReservas = data;
        lastFetched = now; // Actualizamos el tiempo de la última obtención
        return cachedReservas; // Retorna todas las reservas
    } catch (error) {
        mostrarAlerta("Hubo un error al obtener las reservas: " + error.message, "error", false);
        return []; // Retorna un arreglo vacío si hay un error
    }
}

async function enviarDatos(datos) {
    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datos),
        });

        if (!respuesta.ok) {
            const errorDetails = await respuesta.text();
            throw new Error(`Error en la solicitud: ${errorDetails}`);
        }

        // Si la solicitud es exitosa, actualizamos el caché de reservas
        cachedReservas.push(datos);
        lastFetched = Date.now(); // Actualizamos el tiempo de la última obtención
        return await respuesta.json();
    } catch (error) {
        mostrarAlerta("Hubo un error con la solicitud. Inténtelo de nuevo.", "error", false);
    }
}

// ========================== Funciones de Validación si los campos están vacíos ========================== //
function validarFormulario(fecha, horaInicio, horaFin, nombre) {
    if (!fecha || !horaInicio || !horaFin || !nombre) {
        mostrarAlerta("Por favor complete todos los campos.", "error");
        return false;
    }
    return true;
}

// ========================== Funciones de Validación de fechas ========================== //
function validarFecha(fecha) {
    const fechaSeleccionada = new Date(fecha);

    if (isNaN(fechaSeleccionada.getTime())) {
        mostrarAlerta("La fecha seleccionada no tiene un formato válido. Por favor, seleccione una fecha válida.");
        return false;
    }

    const fechaActual = new Date();
    const fechaActualFormateada = fechaActual.toISOString().split('T')[0];
    const fechaSeleccionadaFormateada = fechaSeleccionada.toISOString().split('T')[0]; 

    if (fechaSeleccionadaFormateada < fechaActualFormateada) {
        mostrarAlerta("La fecha seleccionada es una fecha pasada.");
        return false;
    }

    return true;
}

// ========================== Funciones de Validación de horas ========================== //
function convertirAHoraCompleta(hora) {
    const partes = hora.split(':');
    const horas = parseInt(partes[0], 10);
    const minutos = parseInt(partes[1], 10);
    return new Date(0, 0, 0, horas, minutos); // Devuelve una fecha con hora específica
}

// Ajustamos la validación de horarios
async function validarHorarios(fecha, horaInicio, horaFin, salaSeleccionada) {
    // Verificación inicial de horas
    if (horaInicio >= horaFin) {
        mostrarAlerta("La hora de inicio debe ser anterior a la hora de fin. Por favor seleccione un horario válido.");
        return false;
    }

    const reservasExistentes = cachedReservas;

    // Convertir las horas de inicio y fin en objetos Date para facilitar la comparación
    const inicioSeleccionado = convertirAHoraCompleta(horaInicio);
    const finSeleccionado = convertirAHoraCompleta(horaFin);

    let nombreSala = "";
    if (salaSeleccionada === 'otrasala') {
        nombreSala = document.getElementById('nombre_sala_uno').value.trim();
        if (!nombreSala) {
            mostrarAlerta("Por favor ingresa un nombre válido para la sala.");
            return false;
        }
    }

    // Comprobar reservas existentes para el mismo día y sala
    for (let reserva of reservasExistentes) {
        if (reserva.Fecha_reserva === fecha) {
            // Convertir las horas de la reserva a objetos Date para comparar correctamente
            const inicioReservado = convertirAHoraCompleta(reserva.Hora_inicio);
            const finReservado = convertirAHoraCompleta(reserva.Hora_fin);

            // Comparar solo si las salas coinciden
            if (salaSeleccionada === reserva.Tipo_sala || (salaSeleccionada === 'otrasala' && reserva.Tipo_sala === 'otrasala' && reserva.Nombre_sala === nombreSala)) {
                // Verificar si los horarios se cruzan
                if (horariosSeCruzan(inicioSeleccionado, finSeleccionado, inicioReservado, finReservado)) {
                    mostrarAlerta("El horario seleccionado se cruza con una reserva existente en la misma sala y fecha. Por favor seleccione un horario diferente.", "error");
                    return false;
                }
            }
        }
    }

    return true; // Si no hubo cruces, se permite la reserva
}

function horariosSeCruzan(inicioSeleccionado, finSeleccionado, inicioReservado, finReservado) {
    // Verifica si el horario seleccionado se cruza con el reservado
    return !(finSeleccionado <= inicioReservado || inicioSeleccionado >= finReservado);
}

// ========================== Función para Generar Código ========================== //
function generarCodigo() {
    return Math.floor(1000 + Math.random() * 9000); // Genera un número aleatorio entre 1000 y 9999
}

// ========================== Función Principal para Reservar ========================== //
async function reservar(event) {
    event.preventDefault(); // Prevenir el comportamiento normal del formulario

    const botonReservar = document.getElementById('btn_reservar');
    botonReservar.disabled = true; // Deshabilitar el botón de reserva

    const formularioUno = document.getElementById('formulario_uno');

    // Verifica si el formulario existe
    if (!formularioUno) {
        mostrarAlerta("El formulario no se pudo encontrar", "error");
        botonReservar.disabled = false; // Habilitar de nuevo el botón
        return;
    }

    // Obtiene los valores del formulario
    const fecha = formularioUno.fecha.value;
    const actividad = document.getElementById('actividadSeleccionada').value;
    const tiempo = document.getElementById('tiempoSeleccionado').value;
    const horaInicio = formularioUno.hora_inicio.value; 
    const horaFin = formularioUno.hora_fin.value;
    const salaSeleccionada = document.getElementById('salaSeleccionada').value; 
    const nombre = formularioUno.nombre.value; 
    const nombreSala = document.getElementById('nombre_sala_uno').value; 

    // Validar que todos los campos requeridos están completos
    if (!validarFormulario(fecha, horaInicio, horaFin, nombre) ||  
        !validarFecha(fecha) ||  
        !await validarHorarios(fecha, horaInicio, horaFin, salaSeleccionada)) {
        botonReservar.disabled = false; // Habilitar de nuevo el botón
        return;
    }

    // Validación de selección de sala
    if (!salaSeleccionada) {
        mostrarAlerta("Por favor, seleccione una sala.", "error");
        botonReservar.disabled = false; // Habilitar de nuevo el botón
        return;
    }

    if (salaSeleccionada === 'otrasala' && !nombreSala) {
        mostrarAlerta("Debe ingresar el nombre de la sala.", "error");
        botonReservar.disabled = false; // Habilitar de nuevo el botón
        return;
    }

    const codigoReserva = generarCodigo(); // Genera el código

    const datos = {
        Fecha_reserva: fecha,
        Actividad_reserva: actividad,
        Tiempo_reserva: tiempo,
        Hora_inicio: horaInicio,
        Hora_fin: horaFin,
        Tipo_sala: salaSeleccionada,
        Nombre_encargado: nombre,
        Nombre_sala: nombreSala,
        Codigo_reserva: codigoReserva,
    };

    try {
        await enviarDatos(datos); // Envía los datos
        mostrarAlerta("Reserva realizada correctamente. Código de reserva: " + codigoReserva, "success", false);
        setTimeout(() => {
            location.reload();
        }, 3000);
    } catch (error) {
        mostrarAlerta("Hubo un error con la solicitud. Intenta nuevamente.", "error", false);
    } finally {
        botonReservar.disabled = false; // Habilitar de nuevo el botón
    }
}

// ========================== Inicialización y Eventos ========================== // 
document.getElementById('btn_reservar').addEventListener('click', reservar);