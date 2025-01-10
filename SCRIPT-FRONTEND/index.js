document.addEventListener('DOMContentLoaded', () => {
    // ========================== Elementos del DOM ========================== //
    const elements = {
        btnIniciarReservar: document.getElementById('btn_iniciar_reservar'),
        btnCancelarReservaPrincipal: document.getElementById('btn_cancelar_reserva_principal'),
        btnVerReservas: document.getElementById('btn_ver_reservas'),
        btnCerrar: document.getElementById('btn_cerrar'),
        contentOscuro: document.getElementById('content_oscuro'),
        formularios: [
            document.getElementById('formulario_uno'),
            document.getElementById('formulario_dos'),
            document.getElementById('formulario_tres'),
        ],
        salaSeleccionada: document.getElementById('salaSeleccionada'),
        salaSeleccionadauno: document.getElementById('salaSeleccionadauno'),
        actividadSeleccionada: document.getElementById('actividadSeleccionada'),
        tiempoSeleccionado: document.getElementById('tiempoSeleccionado'),
        horaInicio: document.getElementById('hora_inicio'),
        horaFin: document.getElementById('hora_fin'),
        btnReservar: document.getElementById('btn_reservar'),
        errorMessage: document.getElementById('error_message'),
        fechaInput: document.getElementById('fecha'),
        fechaUnoInput: document.getElementById('fecha_uno')  // Nuevo input 'fecha_uno'
    };

    // ========================== Asignar Eventos ========================== //
    elements.btnIniciarReservar.addEventListener('click', () => mostrarFormulario(elements.formularios[0]));
    elements.btnCancelarReservaPrincipal.addEventListener('click', () => mostrarFormulario(elements.formularios[1]));
    elements.btnVerReservas.addEventListener('click', () => mostrarFormulario(elements.formularios[2]));
    elements.btnCerrar.addEventListener('click', cerrarFormularios);

    // Eventos de inputs de tipo 'digito' para manejo de navegación
    document.querySelectorAll('.digito').forEach(input => {
        input.addEventListener('input', manejarCambio);
        input.addEventListener('keydown', manejarRetroceso);
    });

    // Asignación de eventos
    elements.salaSeleccionada.addEventListener('change', actualizarContenedorNombreSala);
    elements.salaSeleccionadauno.addEventListener('change', manejarCambioSala);
    elements.actividadSeleccionada.addEventListener('change', actualizarConfiguracionActividad);
    elements.tiempoSeleccionado.addEventListener('change', () => {
        actualizarConfiguracionActividad();
        autoCompletarHoras();
    });
    elements.horaInicio.addEventListener('change', verificarDuracion);
    elements.horaFin.addEventListener('change', verificarDuracion);
    
    // Inicializar Funciones
    manejarCambioSala();
    deshabilitarDiasPasados();  // Deshabilitar para 'fecha'
    deshabilitarDiasPasadosFechaUno();  // Deshabilitar para 'fecha_uno'
    ocultarMensajeError();
    verificarPermiso();

    // ========================== Funciones ========================== //

    function mostrarFormulario(formulario) {
        elements.contentOscuro.classList.add('show');
        elements.formularios.forEach(f => f.classList.remove('show'));
        formulario.classList.add('show');
    }

    function cerrarFormularios() {
        elements.contentOscuro.classList.remove('show');
        elements.formularios.forEach(f => f.classList.remove('show'));
    }

    function manejarCambio(e) {
        const siguienteInput = e.target.nextElementSibling;
        if (e.target.value.match(/^\d$/) && siguienteInput?.classList.contains('digito')) {
            siguienteInput.focus();
        }
    }

    function manejarRetroceso(e) {
        if (e.key === 'Backspace' && e.target.value === '') {
            const anteriorInput = e.target.previousElementSibling;
            if (anteriorInput?.classList.contains('digito')) {
                anteriorInput.focus();
            }
        }
    }

    function actualizarContenedorNombreSala() {
        const salaSeleccionada = elements.salaSeleccionada.value;
        document.getElementById('content_nombre_sala_uno').style.display = (salaSeleccionada === 'otrasala') ? 'block' : 'none';
    }

    function manejarCambioSala() {
        const salaSeleccionada = elements.salaSeleccionadauno.value;
        const contentContenedor = document.getElementById('content_consultar_reservas');
        const contentNombreSala = document.getElementById('content_nombre_sala_dos');
        
        contentContenedor.innerHTML = '';
        contentNombreSala.style.display = (salaSeleccionada === 'otrasala') ? 'block' : 'none';
    }

    function actualizarConfiguracionActividad() {
        actualizarTiempo();
        verificarDuracion();
    }

    function actualizarTiempo() {
        const actividadSeleccionada = elements.actividadSeleccionada.value;
        const limitesDeTiempo = {
            'Expres': ['30minutos'],
            'Entrevistas': ['30minutos'],
            'Capacitaciones': ['30minutos' ,'40minutos', '50minutos', '1hora'],
            'Reunion': ['30minutos' ,'40minutos', '50minutos', '1hora'],
            'Comité': ['30minutos' ,'40minutos', '50minutos', '1hora', '4horas'],
            'Facturacion': ['30minutos' ,'40minutos', '50minutos', '1hora', '4horas', '8horas'],
            'Induccion': ['30minutos' ,'40minutos', '50minutos', '1hora', '4horas', '8horas', 'diaCompleto']
        };

        // Deshabilitar opciones de tiempo que no sean válidas
        Array.from(elements.tiempoSeleccionado.options).forEach(option => {
            option.disabled = !limitesDeTiempo[actividadSeleccionada]?.includes(option.value);
        });

        // Clean up before enabling inputs
        elements.horaInicio.disabled = false;
        elements.horaFin.disabled = false;
        elements.horaInicio.value = '';
        elements.horaFin.value = '';
        ocultarMensajeError();
    }

    function verificarDuracion() {
        const actividadSeleccionada = elements.actividadSeleccionada.value;
        const tiempoSeleccionado = elements.tiempoSeleccionado.value;
        const horaInicio = elements.horaInicio.value;
        const horaFin = elements.horaFin.value;

        if (!actividadSeleccionada || !tiempoSeleccionado || !horaInicio || !horaFin) {
            ocultarMensajeError();
            return;
        }

        const [horaI, minutoI] = horaInicio.split(':').map(Number);
        const [horaF, minutoF] = horaFin.split(':').map(Number);

        if (horaI > horaF || (horaI === horaF && minutoI >= minutoF)) {
            mostrarMensajeError("La hora de inicio debe ser menor que la hora de fin");
            return;
        }

        const duracionSeleccionada = (horaF * 60 + minutoF) - (horaI * 60 + minutoI);
        const duracionPermitida = obtenerDuracionPermitida(tiempoSeleccionado);

        if (duracionSeleccionada > duracionPermitida) {
            mostrarMensajeError("La duración seleccionada excede el tiempo permitido");
        } else {
            ocultarMensajeError(); // No hay error, así que ocultar el mensaje
        }
    }

    function obtenerDuracionPermitida(tiempoSeleccionado) {
        const duraciones = {
            '30minutos': 30,
            '40minutos': 40,
            '50minutos': 50,
            '1hora': 60,
            '4horas': 240,
            '8horas': 480,
            'diaCompleto': 1440 // 24 horas
        };
        return duraciones[tiempoSeleccionado] || 0;
    }

    function mostrarMensajeError(mensaje) {
        elements.errorMessage.innerText = mensaje;
        elements.errorMessage.style.display = 'block';
        elements.btnReservar.disabled = true;
    }

    function ocultarMensajeError() {
        elements.errorMessage.style.display = 'none';
        actualizarBotonReservar();
    }

    function actualizarBotonReservar() {
        const { salaSeleccionada, actividadSeleccionada, tiempoSeleccionado } = elements;
        elements.btnReservar.disabled = !(salaSeleccionada.value && actividadSeleccionada.value && tiempoSeleccionado.value);
    }

    function deshabilitarDiasPasados() {
        const fechaHoy = new Date();
        elements.fechaInput.setAttribute('min', fechaHoy.toISOString().split('T')[0]);
    }

    function deshabilitarDiasPasadosFechaUno() {
        const fechaHoy = new Date();
        elements.fechaUnoInput.setAttribute('min', fechaHoy.toISOString().split('T')[0]);
    }

    function autoCompletarHoras() {
        const { actividadSeleccionada, tiempoSeleccionado } = elements;
        if (actividadSeleccionada.value === 'Induccion' && tiempoSeleccionado.value === 'diaCompleto') {
            elements.horaInicio.value = '06:00';
            elements.horaFin.value = '18:00';
            elements.horaInicio.disabled = true;
            elements.horaFin.disabled = true;
        } else {
            elements.horaInicio.value = '';
            elements.horaFin.value = '';
            elements.horaInicio.disabled = false;
            elements.horaFin.disabled = false;
        }
    }

    // Añadir evento para detectar cambios en el select de tiempo
    elements.tiempoSeleccionado.addEventListener('change', autoCompletarHoras);
    
    // ========================== Funcion Permiso ========================== //
    function verificarPermiso() {
        const permiso = "3020051890Elia";  // Cambia el valor de permiso según tu lógica
        const opcionOtrouno = elements.salaSeleccionada.querySelector('option[value="otrasala"]');
        const opcionOtrodos = elements.salaSeleccionadauno.querySelector('option[value="otrasala"]');

        if (permiso === "3020051890Eliacith") {
            opcionOtrouno.disabled = false;
            opcionOtrodos.disabled = false;
        } else {
            opcionOtrouno.disabled = true;
            opcionOtrodos.disabled = true;
        }
    }
});
