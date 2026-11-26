// public/js/domain/activity-file-parser.js

/**
 * @typedef {Object} ParsedActivityTelemetry
 * @property {string} title
 * @property {string} date
 * @property {number} distanceKm
 * @property {number} durationMinutes
 * @property {number} elevationGainM
 * @property {string} notes
 */

/**
 * Menghitung jarak Haversine antar dua koordinat (dalam km).
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (/** @type {number} */ deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Mem-parsing file GPX berbasis XML.
 * @param {File} file
 * @returns {Promise<ParsedActivityTelemetry>}
 */
async function parseGpxFile(file) {
  const xmlText = await file.text();
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Format file GPX tidak valid atau rusak.');
  }

  const nameEl = doc.querySelector('trk > name, metadata > name');
  const baseName = file.name.replace(/\.gpx$/i, '');
  const title = (nameEl?.textContent || baseName).trim();

  const points = Array.from(doc.querySelectorAll('trkpt, rtept'));
  if (points.length === 0) {
    throw new Error('File GPX tidak memiliki titik koordinat (trkpt).');
  }

  let totalDistanceKm = 0;
  let totalElevationGainM = 0;
  /** @type {number | null} */
  let prevLat = null;
  /** @type {number | null} */
  let prevLon = null;
  /** @type {number | null} */
  let prevEle = null;
  /** @type {Date | null} */
  let firstTime = null;
  /** @type {Date | null} */
  let lastTime = null;

  for (const pt of points) {
    const lat = Number.parseFloat(pt.getAttribute('lat') || '');
    const lon = Number.parseFloat(pt.getAttribute('lon') || '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    if (prevLat !== null && prevLon !== null) {
      totalDistanceKm += haversineKm(prevLat, prevLon, lat, lon);
    }
    prevLat = lat;
    prevLon = lon;

    const eleText = pt.querySelector('ele')?.textContent;
    if (eleText) {
      const ele = Number.parseFloat(eleText);
      if (Number.isFinite(ele)) {
        if (prevEle !== null && ele > prevEle) {
          totalElevationGainM += ele - prevEle;
        }
        prevEle = ele;
      }
    }

    const timeText = pt.querySelector('time')?.textContent;
    if (timeText) {
      const parsedTime = new Date(timeText);
      if (!Number.isNaN(parsedTime.getTime())) {
        if (!firstTime) firstTime = parsedTime;
        lastTime = parsedTime;
      }
    }
  }

  const metaTimeText = doc.querySelector('metadata > time')?.textContent;
  const startDate = firstTime || (metaTimeText ? new Date(metaTimeText) : new Date(file.lastModified));
  const dateStr = !Number.isNaN(startDate.getTime())
    ? startDate.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const durationMinutes =
    firstTime && lastTime && lastTime > firstTime
      ? Math.round((lastTime.getTime() - firstTime.getTime()) / 60000)
      : 0;

  return {
    title,
    date: dateStr,
    distanceKm: Number(totalDistanceKm.toFixed(2)),
    durationMinutes,
    elevationGainM: Math.round(totalElevationGainM),
    notes: `Imported from ${file.name}`,
  };
}

/**
 * Mem-parsing file biner Garmin/iGPSPORT (.fit).
 * @param {File} file
 * @returns {Promise<ParsedActivityTelemetry>}
 */
async function parseFitFile(file) {
  // @ts-ignore - Dynamic CDN module untuk parsing FIT binary di browser
  const mod = await import('https://esm.sh/fit-file-parser@1.14.0');
  const FitParser = mod.default || mod.FitParser || mod;
  const arrayBuffer = await file.arrayBuffer();

  /** @type {any} */
  const fitData = await new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      elapsedRecordField: true,
      mode: 'cascade',
    });
    parser.parse(arrayBuffer, (/** @type {any} */ err, /** @type {any} */ data) => {
      if (err) reject(new Error(`Gagal membaca file FIT: ${err.message || err}`));
      else resolve(data);
    });
  });

  const session =
    fitData?.activity?.sessions?.[0] ||
    fitData?.sessions?.[0] ||
    {};

  const rawDistance = Number(session.total_distance ?? 0);
  const distanceKm = rawDistance > 1000 ? rawDistance / 1000 : rawDistance;

  const totalSeconds = Number(session.total_timer_time ?? session.total_elapsed_time ?? 0);
  const durationMinutes = totalSeconds > 0 ? Math.round(totalSeconds / 60) : 0;
  const elevationGainM = Math.round(Number(session.total_ascent ?? 0));

  const startTimeRaw = session.start_time || fitData?.activity?.timestamp || file.lastModified;
  const startDate = new Date(startTimeRaw);
  const dateStr = !Number.isNaN(startDate.getTime())
    ? startDate.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const baseName = file.name.replace(/\.fit$/i, '');

  return {
    title: baseName,
    date: dateStr,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationMinutes,
    elevationGainM,
    notes: `Imported from ${file.name}`,
  };
}

/**
 * Mendeteksi ekstensi (.fit atau .gpx) dan mengembalikan data telemetri siap pakai.
 * @param {File} file
 * @returns {Promise<ParsedActivityTelemetry>}
 */
export async function parseActivityFile(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.gpx')) {
    return parseGpxFile(file);
  }
  if (lower.endsWith('.fit')) {
    return parseFitFile(file);
  }
  throw new Error('Format file tidak didukung. Gunakan file .fit atau .gpx.');
}