<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mesa de Ayuda</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <!-- Agregar la librería jsPDF como script global -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.4.0/jspdf.umd.min.js"></script>
    <script type="module" src="app.js"></script>
    <style>
        #kpiContainer {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            padding: 15px;
        }
    </style>
</head>
<body>
    <div class="container my-5">
        <h1 class="text-center mb-4">Mesa de Ayuda</h1>

        <!-- Interfaz de Selección de Rol -->
        <div id="roleSelection" class="card p-4 shadow-sm mb-5">
            <h3>Selecciona tu rol</h3>
            <button id="adminLogin" class="btn btn-primary">Administrador</button>
            <button id="userLogin" class="btn btn-secondary">Usuario</button>
        </div>

        <!-- Interfaz de Usuario -->
        <div id="userInterface" style="display: none;">
            <button id="backToUserRoleSelection" class="btn btn-secondary mb-3">Volver a la Selección de Rol</button>
            
            <!-- Formulario de Envío de Ticket -->
            <div class="card p-4 shadow-sm mb-5">
                <h3>Enviar un Ticket</h3>
                <form id="ticketForm" autocomplete="off">
                    <div class="form-group">
                        <label for="usuario">Nombre</label>
                        <input type="text" id="usuario" class="form-control" placeholder="Nombre" required>
                    </div>
                    <div class="form-group">
                        <label for="company">Compañía</label>
                        <select id="company" class="form-control" required>
                            <option value="">Seleccione una compañía</option>
                            <option value="Colinas Alta Vista">Colinas Alta Vista</option>
                            <option value="Allpack">Allpack</option>
                            <option value="Business On Line">Business On Line</option>
                            <option value="Zona Franca">Zona Franca</option>
                            <option value="Almacén Fiscal La Victoria">Almacén Fiscal La Victoria</option>
                            <option value="Hotel Colinas Alta Vista">Hotel Colinas Alta Vista</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="email">Correo Electrónico</label>
                        <input type="email" id="email" class="form-control" placeholder="Correo Electrónico" required>
                    </div>
                    <div class="form-group">
                        <label for="descripcion">Descripción del problema</label>
                        <textarea id="descripcion" class="form-control" placeholder="Describe tu problema" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="teamviewer_id">ID TeamViewer <small>(En caso de necesitar asistencia remota)</small></label>
                        <input type="text" id="teamviewer_id" class="form-control" placeholder="ID TeamViewer">
                    </div>
                    <div class="form-group">
                        <label for="password">Contraseña TW</label>
                        <input type="text" id="password" class="form-control" placeholder="Contraseña TeamViewer">
                    </div>
                    <button type="submit" class="btn btn-primary">Enviar Ticket</button>
                </form>
            </div>

            <!-- Filtros para Usuario -->
            <div class="form-inline mb-3">
                <select id="userFilterStatus" class="form-control mr-2">
                    <option value="">Todos los Estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en proceso">En Proceso</option>
                    <option value="cerrado">Cerrado</option>
                </select>
                <select id="userFilterCompany" class="form-control mr-2">
                    <option value="">Todas las Compañías</option>
                    <option value="Colinas Alta Vista">Colinas Alta Vista</option>
                    <option value="Allpack">Allpack</option>
                    <option value="Business On Line">Business On Line</option>
                    <option value="Zona Franca">Zona Franca</option>
                    <option value="Almacén Fiscal La Victoria">Almacén Fiscal La Victoria</option>
                    <option value="Hotel Colinas Alta Vista">Hotel Colinas Alta Vista</option>
                </select>
                <input type="date" id="userFilterStartDate" class="form-control mr-2">
                <input type="date" id="userFilterEndDate" class="form-control mr-2">
                <button id="userFilterApply" class="btn btn-primary">Aplicar Filtros</button>
            </div>

            <!-- Tablero de Tickets para Usuario -->
            <h2 class="text-center mb-4">Tablero de Tickets</h2>
            <table class="table table-bordered" id="ticketTableUser">
                <thead>
                    <tr>
                        <th>Número de Ticket</th>
                        <th>Usuario</th>
                        <th>Correo Electrónico</th>
                        <th>Compañía</th>
                        <th>Descripción</th>
                        <th>Estado</th>
                        <th>Comentarios</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <!-- Interfaz de Administrador -->
        <div id="adminInterface" style="display: none;">
            <button id="backToAdminRoleSelection" class="btn btn-secondary mb-3">Volver a la Selección de Rol</button>
            
            <!-- Filtros para Administrador -->
            <div class="form-inline mb-3">
                <select id="adminFilterStatus" class="form-control mr-2">
                    <option value="">Todos los Estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en proceso">En Proceso</option>
                    <option value="cerrado">Cerrado</option>
                </select>
                <select id="adminFilterCompany" class="form-control mr-2">
                    <option value="">Todas las Compañías</option>
                    <option value="Colinas Alta Vista">Colinas Alta Vista</option>
                    <option value="Allpack">Allpack</option>
                    <option value="Business On Line">Business On Line</option>
                    <option value="Zona Franca">Zona Franca</option>
                    <option value="Almacén Fiscal La Victoria">Almacén Fiscal La Victoria</option>
                    <option value="Hotel Colinas Alta Vista">Hotel Colinas Alta Vista</option>
                </select>
                <input type="date" id="adminFilterStartDate" class="form-control mr-2">
                <input type="date" id="adminFilterEndDate" class="form-control mr-2">
                <button id="adminFilterApply" class="btn btn-primary">Aplicar Filtros</button>
            </div>

            <h3 class="mt-5">KPI Mensual</h3>
            <div id="kpiContainer">
                <p><strong>Total de Tickets:</strong> <span id="kpiTotal"></span></p>
                <p><strong>Tickets Cerrados:</strong> <span id="kpiCerrados"></span></p>
                <p><strong>Promedio de Resolución (horas):</strong> <span id="kpiPromedioResolucion"></span></p>
                <p><strong>% de Tickets Cerrados:</strong> <span id="kpiPorcentajeCerrados"></span></p>
                <button id="downloadKpiPdf" class="btn btn-primary mt-3" aria-label="Descargar KPI mensual en PDF">Descargar KPI en PDF</button>
            </div>

            <!-- Tablero de Tickets para Administrador -->
            <h2 class="text-center mb-4">Tablero de Tickets</h2>
            <table class="table table-bordered" id="ticketTableAdmin">
                <thead>
                    <tr>
                        <th>Número de Ticket</th>
                        <th>Usuario</th>
                        <th>Correo Electrónico</th>
                        <th>Compañía</th>
                        <th>Descripción</th>
                        <th>ID TeamViewer</th>
                        <th>Contraseña TW</th>
                        <th>Estado</th>
                        <th>Fecha de Inicio</th>
                        <th>Fecha de Resolución</th>
                        <th>Comentarios</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <h3 class="mt-5">Estadísticas</h3>
            <ul id="adminStats" class="list-group mt-3">
                <!-- Estadísticas del administrador se cargarán aquí -->
            </ul>
        </div>
    </div>
</body>
</html>

