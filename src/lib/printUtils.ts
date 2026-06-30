/**
 * Utilidades para impresión nativa de manifiestos en formato A4 vertical.
 * Genera un documento HTML limpio, optimizado para impresión (blanco y negro, sin fondos pesados)
 * y ejecuta window.print() en una ventana emergente.
 */

export type TripPrintData = {
  companyName: string;
  companyRuc?: string;
  companyLogoUrl?: string;
  routeName: string;
  departureTime: string;
  vehicleType: string;
  plateNumber?: string;
};

export type PassengerPrintData = {
  seatId: string;
  name: string;
  document: string;
  origin: string;
  destination: string;
  paymentStatus: string;
  paymentMethod: string;
};

export type ParcelPrintData = {
  senderName: string;
  receiverName: string;
  description: string | null;
  weightKg: number | null;
  totalPrice: number;
  paymentStatus: string;
  startWaypoint: { station: { name: string } };
  endWaypoint: { station: { name: string } };
};

// Traductor de tipos de vehículos
const vehicleLabel: Record<string, string> = {
  MINIVAN: "Minivan",
  BUS_1P: "Bus 1 Piso",
  BUS_2P: "Bus 2 Pisos",
  AUTO: "Auto",
};

/**
 * Abre una ventana del navegador e imprime el Manifiesto de Pasajeros.
 */
export function printPassengerManifest(trip: TripPrintData, passengers: PassengerPrintData[]) {
  const depDate = new Date(trip.departureTime);
  const dateStr = depDate.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = depDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  // Ordenar pasajeros por número de asiento si es posible
  const sortedPassengers = [...passengers].sort((a, b) => {
    const numA = parseInt(a.seatId.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.seatId.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) {
    alert("Por favor habilita las ventanas emergentes (popups) para poder imprimir.");
    return;
  }

  const rowsHtml = sortedPassengers.map((p, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="text-align: center; font-weight: bold;">${p.seatId.replace(/\D/g, "")}</td>
      <td>${p.name.toUpperCase()}</td>
      <td style="text-align: center;">${p.document}</td>
      <td>${p.origin.toLowerCase()}</td>
      <td>${p.destination.toLowerCase()}</td>
      <td style="text-align: center; font-size: 10px;">${p.paymentStatus === 'PAID' || p.paymentStatus === 'PAID_DIGITAL' ? 'PAGADO' : 'COBRAR'}</td>
      <td style="height: 35px;"></td>
    </tr>
  `).join("");

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Manifiesto de Pasajeros - ${trip.routeName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 12mm 15mm 12mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
          }
          body {
            padding: 10px;
            background: #fff;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .header-table td {
            border: none;
            padding: 4px;
          }
          .title-section {
            text-align: center;
            padding: 10px 0;
          }
          .title-section h1 {
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .title-section p {
            font-size: 11px;
            color: #555;
            margin-top: 3px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 11px;
          }
          .info-item {
            margin-bottom: 6px;
          }
          .info-label {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            color: #444;
          }
          .info-val {
            font-size: 12px;
            margin-top: 2px;
          }
          .manifest-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 30px;
          }
          .manifest-table th, .manifest-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
          }
          .manifest-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
          }
          .footer-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          .signature-box {
            width: 30%;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 8px;
            margin-top: 50px;
          }
          .logo-placeholder {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .text-right {
            text-align: right;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 25%;">
              ${trip.companyLogoUrl ? `
                <img src="${trip.companyLogoUrl}" alt="${trip.companyName}" style="max-height: 45px; max-width: 150px; object-fit: contain;" />
              ` : `
                <span class="logo-placeholder">${trip.companyName.toUpperCase()}</span>
              `}
            </td>
            <td class="title-section" style="width: 50%;">
              <h1>Manifiesto de Pasajeros</h1>
              <p>Documento de Control y Abordaje Operativo</p>
            </td>
            <td class="text-right" style="width: 25%; font-size: 11px; line-height: 1.4;">
              <strong>RUC:</strong> ${trip.companyRuc || 'No configurado'}<br />
              <strong>Fecha Impresión:</strong> ${new Date().toLocaleDateString('es-PE')}<br />
              <strong>Hora Impresión:</strong> ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </td>
          </tr>
        </table>

        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Ruta:</span>
              <div class="info-val" style="font-weight: bold;">${trip.routeName.toUpperCase()}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Fecha del Viaje:</span>
              <div class="info-val">${dateStr} - ${timeStr}</div>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Placa de Vehículo:</span>
              <div class="info-val" style="font-weight: bold; text-transform: uppercase;">${trip.plateNumber || '________________'}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Tipo de Vehículo:</span>
              <div class="info-val">${vehicleLabel[trip.vehicleType] || trip.vehicleType}</div>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Conductor Principal:</span>
              <div class="info-val">___________________________</div>
            </div>
            <div class="info-item">
              <span class="info-label">Copiloto / Relevo:</span>
              <div class="info-val">___________________________</div>
            </div>
          </div>
        </div>

        <table class="manifest-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">N°</th>
              <th style="width: 8%; text-align: center;">Asiento</th>
              <th style="width: 32%;">Nombres y Apellidos</th>
              <th style="width: 15%; text-align: center;">Documento</th>
              <th style="width: 12%;">Origen</th>
              <th style="width: 12%;">Destino</th>
              <th style="width: 8%; text-align: center;">Estado</th>
              <th style="width: 8%; text-align: center;">Firma</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #555;">No hay pasajeros registrados para este viaje.</td></tr>`}
          </tbody>
        </table>

        <div style="font-size: 11px; font-weight: bold; margin-bottom: 20px;">
          Total Pasajeros a Bordo: ${passengers.length}
        </div>

        <div class="footer-section">
          <div class="signature-box">
            Firma del Conductor
          </div>
          <div class="signature-box">
            Firma del Despachador
          </div>
          <div class="signature-box">
            Control de Autoridad / SUTRAN
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          }
        </script>
      </body>
    </html>
  `);

  win.document.close();
}

/**
 * Abre una ventana del navegador e imprime el Manifiesto de Encomiendas.
 */
export function printParcelManifest(trip: TripPrintData, parcels: ParcelPrintData[]) {
  const depDate = new Date(trip.departureTime);
  const dateStr = depDate.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = depDate.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) {
    alert("Por favor habilita las ventanas emergentes (popups) para poder imprimir.");
    return;
  }

  let totalWeight = 0;
  let totalImport = 0;

  const rowsHtml = parcels.map((p, idx) => {
    const weight = Number(p.weightKg) || 0;
    const priceVal = Number(p.totalPrice) || 0;
    totalWeight += weight;
    totalImport += priceVal;

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${p.senderName.toUpperCase()}</td>
        <td>${p.receiverName.toUpperCase()}</td>
        <td>${p.startWaypoint?.station?.name || 'Origen'}</td>
        <td>${p.endWaypoint?.station?.name || 'Destino'}</td>
        <td>${p.description || 'Encomienda General'}</td>
        <td style="text-align: center;">${weight > 0 ? `${weight} kg` : '-'}</td>
        <td style="text-align: center; font-weight: bold;">S/ ${priceVal.toFixed(2)}</td>
        <td style="text-align: center; font-size: 10px;">${p.paymentStatus === 'PAID' ? 'PAGADO' : 'C. ENTREGA'}</td>
      </tr>
    `;
  }).join("");

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Manifiesto de Encomiendas - ${trip.routeName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 12mm 15mm 12mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
          }
          body {
            padding: 10px;
            background: #fff;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .header-table td {
            border: none;
            padding: 4px;
          }
          .title-section {
            text-align: center;
            padding: 10px 0;
          }
          .title-section h1 {
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .title-section p {
            font-size: 11px;
            color: #555;
            margin-top: 3px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 11px;
          }
          .info-item {
            margin-bottom: 6px;
          }
          .info-label {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            color: #444;
          }
          .info-val {
            font-size: 12px;
            margin-top: 2px;
          }
          .manifest-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 30px;
          }
          .manifest-table th, .manifest-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
          }
          .manifest-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
          }
          .footer-summary {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 35px;
            font-size: 12px;
          }
          .footer-summary td {
            border: 1px solid #000;
            padding: 8px;
          }
          .footer-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-around;
            font-size: 11px;
          }
          .signature-box {
            width: 35%;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 8px;
            margin-top: 50px;
          }
          .logo-placeholder {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .text-right {
            text-align: right;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 25%;">
              ${trip.companyLogoUrl ? `
                <img src="${trip.companyLogoUrl}" alt="${trip.companyName}" style="max-height: 45px; max-width: 150px; object-fit: contain;" />
              ` : `
                <span class="logo-placeholder">${trip.companyName.toUpperCase()}</span>
              `}
            </td>
            <td class="title-section" style="width: 50%;">
              <h1>Manifiesto de Carga y Encomiendas</h1>
              <p>Guía de Control de Despacho y Almacén</p>
            </td>
            <td class="text-right" style="width: 25%; font-size: 11px; line-height: 1.4;">
              <strong>RUC:</strong> ${trip.companyRuc || 'No configurado'}<br />
              <strong>Fecha Impresión:</strong> ${new Date().toLocaleDateString('es-PE')}<br />
              <strong>Hora Impresión:</strong> ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </td>
          </tr>
        </table>

        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Ruta / Trayecto:</span>
              <div class="info-val" style="font-weight: bold;">${trip.routeName.toUpperCase()}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Salida de Viaje:</span>
              <div class="info-val">${dateStr} - ${timeStr}</div>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Vehículo Placa:</span>
              <div class="info-val" style="font-weight: bold; text-transform: uppercase;">${trip.plateNumber || '________________'}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Tipo de Vehículo:</span>
              <div class="info-val">${vehicleLabel[trip.vehicleType] || trip.vehicleType}</div>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Operador Despacho:</span>
              <div class="info-val">___________________________</div>
            </div>
            <div class="info-item">
              <span class="info-label">Conductor a Cargo:</span>
              <div class="info-val">___________________________</div>
            </div>
          </div>
        </div>

        <table class="manifest-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">N°</th>
              <th style="width: 20%;">Remitente</th>
              <th style="width: 20%;">Destinatario</th>
              <th style="width: 12%;">Origen</th>
              <th style="width: 12%;">Destino</th>
              <th style="width: 15%;">Contenido / Desc.</th>
              <th style="width: 8%; text-align: center;">Peso</th>
              <th style="width: 8%; text-align: center;">Importe</th>
              <th style="width: 10%; text-align: center;">Pago</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #555;">No hay encomiendas registradas para este viaje.</td></tr>`}
          </tbody>
        </table>

        <table class="footer-summary" style="width: 320px; margin-left: auto;">
          <tr>
            <td style="font-weight: bold; background-color: #f0f0f0;">Total Bultos / Encomiendas</td>
            <td style="text-align: right; font-weight: bold;">${parcels.length}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f0f0f0;">Peso Total Registrado</td>
            <td style="text-align: right;">${totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : '-'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #f0f0f0; font-size: 13px;">Total Recaudado (S/)</td>
            <td style="text-align: right; font-weight: bold; font-size: 13px; color: #000;">S/ ${totalImport.toFixed(2)}</td>
          </tr>
        </table>

        <div class="footer-section">
          <div class="signature-box">
            Firma del Despachador de Almacén
          </div>
          <div class="signature-box">
            Firma del Conductor (Recepción de Carga)
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          }
        </script>
      </body>
    </html>
  `);

  win.document.close();
}
