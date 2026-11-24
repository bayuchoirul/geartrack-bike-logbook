// frontend/js/services/activity-file-parser.js

const EARTH_RADIUS_KM = 6371;
const MAX_GAP_SECONDS = 300; // Jeda > 5 menit antar titik dianggap berhenti/istirahat
const MAX_SPEED_KMH = 110;   // Batas kecepatan realistis untuk menyaring lonjakan/glitch GPS

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    ![lat1, lon1, lat2, lon2].every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    return 0;
  }
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function formatLocalDateTimeInput(dateObj) {
  const d = dateObj instanceof Date && !Number.isNaN(dateObj.getTime()) ? dateObj : new Date();
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function normalizeSportType(rawType = '', fileName = '', title = '') {
  const combined = `${rawType} ${title} ${fileName}`.toLowerCase();

  if (
    combined.includes('gravel') ||
    combined.includes('unpaved') ||
    combined.includes('trail')
  ) {
    return 'Gravel';
  }

  if (
    combined.includes('commute') ||
    combined.includes('work') ||
    combined.includes('kampus') ||
    combined.includes('kantor')
  ) {
    return 'Commute';
  }

  if (
    combined.includes('trainer') ||
    combined.includes('indoor') ||
    combined.includes('virtual') ||
    combined.includes('zwift') ||
    combined.includes('rouvy')
  ) {
    return 'Trainer/Ind.';
  }

  if (combined.includes('run') || combined.includes('lari')) {
    return 'Run';
  }

  return 'Road';
}

function computeTrackMetrics(points = []) {
  let distanceKm = 0;
  let movingSeconds = 0;
  let elevationGainM = 0;
  let startTime = null;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (pt.time && !startTime) {
      startTime = pt.time;
    }

    if (i === 0) continue;
    const prev = points[i - 1];

    const segKm = haversineDistanceKm(prev.lat, prev.lon, pt.lat, pt.lon);
    let dtSec = 0;

    if (prev.time && pt.time) {
      dtSec = (pt.time.getTime() - prev.time.getTime()) / 1000;
    }

    // Saring jeda berhenti terlalu panjang atau lonjakan GPS tidak wajar
    const isValidTimeStep = dtSec > 0 && dtSec <= MAX_GAP_SECONDS;
    const speedKmh = isValidTimeStep ? (segKm / dtSec) * 3600 : 0;

    if (segKm > 0 && segKm < 2 && (!isValidTimeStep || speedKmh <= MAX_SPEED_KMH)) {
      distanceKm += segKm;
      if (isValidTimeStep) {
        movingSeconds += dtSec;
      }
    } else if (isValidTimeStep && segKm === 0) {
      // Titik diam dalam batas waktu singkat (< 5 menit) tetap dihitung bila sangat singkat,
      // namun diabaikan bila sudah mendekati batas pause agar moving time tetap akurat
      if (dtSec <= 30) {
        movingSeconds += dtSec;
      }
    }

    if (
      typeof prev.ele === 'number' &&
      Number.isFinite(prev.ele) &&
      typeof pt.ele === 'number' &&
      Number.isFinite(pt.ele)
    ) {
      const diffEle = pt.ele - prev.ele;
      // Ambang minimal 0.5m untuk meredam noise barometer/GPS
      if (diffEle > 0.5 && diffEle < 50) {
        elevationGainM += diffEle;
      }
    }
  }

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    movingSeconds: Math.round(movingSeconds),
    elevationGainM: Math.round(elevationGainM),
    startTime
  };
}

export async function parseGpxFile(file) {
  const text = await file.text();
  if (!text || !text.trim()) {
    throw new Error('File GPX kosong.');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'application/xml');
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Format XML pada file GPX tidak valid atau rusak.');
  }

  const fallbackName = file.name.replace(/\.gpx$/i, '');
  const trackName =
    xmlDoc.querySelector('trk > name')?.textContent?.trim() ||
    xmlDoc.querySelector('rte > name')?.textContent?.trim() ||
    xmlDoc.querySelector('metadata > name')?.textContent?.trim() ||
    fallbackName;

  const rawSportType =
    xmlDoc.querySelector('trk > type')?.textContent?.trim() ||
    xmlDoc.querySelector('rte > type')?.textContent?.trim() ||
    '';

  const ptNodes = Array.from(xmlDoc.querySelectorAll('trkpt, rtept, wpt'));
  if (!ptNodes.length) {
    throw new Error('File GPX tidak memiliki titik koordinat (track/route/waypoint).');
  }

  const points = ptNodes
    .map((node) => {
      const lat = Number(node.getAttribute('lat'));
      const lon = Number(node.getAttribute('lon'));
      const timeText = node.querySelector('time')?.textContent?.trim();
      const eleText = node.querySelector('ele')?.textContent?.trim();

      const parsedTime = timeText ? new Date(timeText) : null;
      const validTime =
        parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime : null;

      const parsedEle =
        eleText !== undefined && eleText !== '' ? Number(eleText) : null;
      const validEle =
        parsedEle !== null && Number.isFinite(parsedEle) ? parsedEle : null;

      return {
        lat,
        lon,
        time: validTime,
        ele: validEle
      };
    })
    .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lon));

  if (!points.length) {
    throw new Error('Koordinat latitude/longitude pada file GPX tidak valid.');
  }

  const metrics = computeTrackMetrics(points);
  const effectiveDate = metrics.startTime || new Date();
  const rideType = normalizeSportType(rawSportType, file.name, trackName);
  const warnings = [];

  if (!metrics.startTime) {
    warnings.push('Timestamp tidak ditemukan di GPX; tanggal diisi waktu saat ini.');
  }
  if (metrics.distanceKm <= 0) {
    warnings.push('Jarak rute terdeteksi 0 km; periksa kembali isi file atau isi manual.');
  }

  return {
    sourceFormat: 'gpx',
    fileName: file.name,
    title: trackName,
    distanceKm: metrics.distanceKm,
    movingMinutes: Math.max(0, Math.round(metrics.movingSeconds / 60)),
    movingSeconds: metrics.movingSeconds,
    elevationGainM: metrics.elevationGainM,
    rideType,
    startDate: effectiveDate,
    dateTimeLocal: formatLocalDateTimeInput(effectiveDate),
    warnings
  };
}

// --- Client-Side FIT Binary Parser (Garmin / iGPSPORT) ---
const FIT_EPOCH_MS = Date.UTC(1989, 11, 31, 0, 0, 0);
const BASE_TYPE_META = {
  0x00: { size: 1, invalid: 0xff },       // enum
  0x01: { size: 1, invalid: 0x7f },       // sint8
  0x02: { size: 1, invalid: 0xff },       // uint8
  0x83: { size: 2, invalid: 0x7fff },     // sint16
  0x84: { size: 2, invalid: 0xffff },     // uint16
  0x85: { size: 4, invalid: 0x7fffffff }, // sint32
  0x86: { size: 4, invalid: 0xffffffff }, // uint32
  0x07: { size: 1, invalid: 0x00 },       // string
  0x88: { size: 4, invalid: NaN },        // float32
  0x89: { size: 8, invalid: NaN },        // float64
  0x0a: { size: 1, invalid: 0xff },       // uint8z
  0x8b: { size: 2, invalid: 0xffff },     // uint16z
  0x8c: { size: 4, invalid: 0xffffffff }, // uint32z
  0x0d: { size: 1, invalid: 0xff },       // byte
  0x8e: { size: 8, invalid: 0xffffffffffffffffn }, // sint64
  0x8f: { size: 8, invalid: 0xffffffffffffffffn }, // uint64
  0x90: { size: 8, invalid: 0xffffffffffffffffn }  // uint64z
};

function fitTimestampToDate(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return null;
  const ms = FIT_EPOCH_MS + ts * 1000;
  const dt = new Date(ms);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function readFitValue(view, offset, baseType, size, isLittleEndian) {
  const typeCode = baseType & 0x1f;
  const meta = BASE_TYPE_META[baseType] || BASE_TYPE_META[typeCode] || { size: 1, invalid: 0xff };

  if (typeCode === 0x07) {
    // String null-terminated / UTF-8
    let bytes = [];
    for (let i = 0; i < size; i++) {
      const b = view.getUint8(offset + i);
      if (b === 0) break;
      bytes.push(b);
    }
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes)).trim();
    } catch {
      return String.fromCharCode(...bytes).trim();
    }
  }

  if (size === 1) {
    const val = (baseType & 0x80) === 0 && (baseType === 0x01)
      ? view.getInt8(offset)
      : view.getUint8(offset);
    return val === meta.invalid ? null : val;
  }

  if (size === 2) {
    const val = baseType === 0x83
      ? view.getInt16(offset, isLittleEndian)
      : view.getUint16(offset, isLittleEndian);
    return val === meta.invalid ? null : val;
  }

  if (size === 4) {
    if (baseType === 0x88) {
      const f = view.getFloat32(offset, isLittleEndian);
      return Number.isFinite(f) ? f : null;
    }
    const val = baseType === 0x85
      ? view.getInt32(offset, isLittleEndian)
      : view.getUint32(offset, isLittleEndian);
    return val === meta.invalid ? null : val;
  }

  // Fallback untuk ukuran non-standar
  return null;
}

function decodeFitBuffer(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength < 14) {
    throw new Error('File FIT terlalu kecil atau tidak valid.');
  }

  const view = new DataView(arrayBuffer);
  const headerSize = view.getUint8(0);
  const protocolVersion = view.getUint8(1);

  if (headerSize < 12 || protocolVersion === 0) {
    throw new Error('Header file FIT tidak valid.');
  }

  const dataSize = view.getUint32(4, true);
  const sig =
    String.fromCharCode(view.getUint8(8)) +
    String.fromCharCode(view.getUint8(9)) +
    String.fromCharCode(view.getUint8(10)) +
    String.fromCharCode(view.getUint8(11));

  if (sig !== '.FIT') {
    throw new Error('File bukan berformat FIT (.FIT) yang valid.');
  }

  const endOffset = Math.min(headerSize + dataSize, arrayBuffer.byteLength);
  let offset = headerSize;
  const localDefs = {};

  let sessionSummary = null;
  const recordPoints = [];
  let maxRecordDistanceMeters = 0;
  let lastRecordTimestamp = null;
  let firstRecordTimestamp = null;

  while (offset < endOffset) {
    const recordHeader = view.getUint8(offset);
    offset += 1;

    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;
    let localMesgNum = 0;
    let isDefinition = false;
    let hasDevFields = false;
    let timeOffsetSec = 0;

    if (isCompressedTimestamp) {
      localMesgNum = (recordHeader >> 5) & 0x03;
      timeOffsetSec = recordHeader & 0x1f;
      if (lastRecordTimestamp !== null) {
        const currentTs = (lastRecordTimestamp & ~0x1f) + timeOffsetSec;
        lastRecordTimestamp = currentTs < lastRecordTimestamp ? currentTs + 32 : currentTs;
      }
    } else {
      isDefinition = (recordHeader & 0x40) !== 0;
      hasDevFields = (recordHeader & 0x20) !== 0;
      localMesgNum = recordHeader & 0x0f;
    }

    if (isDefinition) {
      if (offset + 5 > endOffset) break;
      offset += 1; // reserved
      const arch = view.getUint8(offset);
      offset += 1;
      const isLittleEndian = arch === 0;
      const globalMesgNum = view.getUint16(offset, isLittleEndian);
      offset += 2;
      const numFields = view.getUint8(offset);
      offset += 1;

      const fields = [];
      for (let i = 0; i < numFields; i++) {
        if (offset + 3 > endOffset) break;
        const fieldDefNum = view.getUint8(offset);
        const size = view.getUint8(offset + 1);
        const baseType = view.getUint8(offset + 2);
        offset += 3;
        fields.push({ fieldDefNum, size, baseType });
      }

      if (hasDevFields && offset < endOffset) {
        const numDevFields = view.getUint8(offset);
        offset += 1;
        offset += numDevFields * 3;
      }

      localDefs[localMesgNum] = {
        globalMesgNum,
        isLittleEndian,
        fields
      };
    } else {
      const def = localDefs[localMesgNum];
      if (!def) break;

      const row = {};
      for (const f of def.fields) {
        if (offset + f.size > endOffset) {
          offset = endOffset;
          break;
        }
        const val = readFitValue(view, offset, f.baseType, f.size, def.isLittleEndian);
        offset += f.size;
        if (val !== null && val !== undefined && val !== '') {
          row[f.fieldDefNum] = val;
        }
      }

      if (isCompressedTimestamp && row[253] === undefined && lastRecordTimestamp !== null) {
        row[253] = lastRecordTimestamp;
      }
      if (typeof row[253] === 'number') {
        lastRecordTimestamp = row[253];
        if (firstRecordTimestamp === null) firstRecordTimestamp = row[253];
      }

      // Global Message 18 = session
      if (def.globalMesgNum === 18) {
        sessionSummary = {
          startTimeTs: row[2] ?? row[253] ?? null,
          totalElapsedTimeSec: typeof row[7] === 'number' ? row[7] / 1000 : null,
          totalTimerTimeSec: typeof row[8] === 'number' ? row[8] / 1000 : null,
          totalDistanceMeters: typeof row[9] === 'number' ? row[9] / 100 : null,
          totalAscentM: typeof row[22] === 'number' ? row[22] : null,
          sport: row[5] ?? null,
          subSport: row[64] ?? null
        };
      }

      // Global Message 20 = record
      if (def.globalMesgNum === 20) {
        const distMeters = typeof row[5] === 'number' ? row[5] / 100 : 0;
        if (distMeters > maxRecordDistanceMeters) {
          maxRecordDistanceMeters = distMeters;
        }
        const latSemi = typeof row[0] === 'number' ? row[0] : null;
        const lonSemi = typeof row[1] === 'number' ? row[1] : null;
        const lat = latSemi !== null ? latSemi * (180 / 2147483648) : null;
        const lon = lonSemi !== null ? lonSemi * (180 / 2147483648) : null;
        const alt = typeof row[78] === 'number' ? row[78] / 5 - 500 : null;

        recordPoints.push({
          lat,
          lon,
          alt,
          distMeters,
          ts: typeof row[253] === 'number' ? row[253] : null
        });
      }
    }
  }

  return {
    sessionSummary,
    recordPoints,
    maxRecordDistanceMeters,
    firstRecordTimestamp,
    lastRecordTimestamp
  };
}

function mapFitSportToLabel(sportCode, subSportCode) {
  // Referensi umum FIT sport enum: 1 = running, 2 = cycling
  if (sportCode === 1) return 'Run';

  if (sportCode === 2) {
    // sub_sport umum pada cycling: 6 = gravel_cycling, 14 = indoor_cycling / virtual_activity
    if (subSportCode === 6 || subSportCode === 10) return 'Gravel';
    if (subSportCode === 14 || subSportCode === 15 || subSportCode === 18) return 'Trainer/Ind.';
    return 'Road';
  }

  return normalizeSportType(String(sportCode ?? ''), '', '');
}

export async function parseFitFile(file) {
  if (!file || file.size === 0) {
    throw new Error('File FIT kosong.');
  }

  const buffer = await file.arrayBuffer();
  const decoded = decodeFitBuffer(buffer);
  const warnings = [];

  const summary = decoded.sessionSummary || {};
  const fallbackTitle = file.name.replace(/\.fit$/i, '');

  // Jarak: prioritas total_distance dari session, fallback ke jarak record tertinggi atau Haversine
  let distanceKm = 0;
  if (typeof summary.totalDistanceMeters === 'number' && summary.totalDistanceMeters > 0) {
    distanceKm = summary.totalDistanceMeters / 1000;
  } else if (decoded.maxRecordDistanceMeters > 0) {
    distanceKm = decoded.maxRecordDistanceMeters / 1000;
  } else {
    const validCoords = decoded.recordPoints.filter(
      (p) => typeof p.lat === 'number' && typeof p.lon === 'number'
    );
    if (validCoords.length > 1) {
      distanceKm = computeTrackMetrics(
        validCoords.map((p) => ({ lat: p.lat, lon: p.lon, time: fitTimestampToDate(p.ts), ele: p.alt }))
      ).distanceKm;
    }
  }

  // Durasi bergerak: prioritas total_timer_time dari session, fallback ke akumulasi delta record yang valid
  let movingSeconds = 0;
  if (typeof summary.totalTimerTimeSec === 'number' && summary.totalTimerTimeSec > 0) {
    movingSeconds = summary.totalTimerTimeSec;
  } else if (typeof summary.totalElapsedTimeSec === 'number' && summary.totalElapsedTimeSec > 0) {
    movingSeconds = summary.totalElapsedTimeSec;
    warnings.push('Menggunakan total elapsed time karena timer time tidak tersedia di file FIT.');
  } else {
    const ptsWithTs = decoded.recordPoints.filter((p) => typeof p.ts === 'number');
    for (let i = 1; i < ptsWithTs.length; i++) {
      const dt = ptsWithTs[i].ts - ptsWithTs[i - 1].ts;
      if (dt > 0 && dt <= MAX_GAP_SECONDS) {
        movingSeconds += dt;
      }
    }
  }

  const startDateObj =
    fitTimestampToDate(summary.startTimeTs) ||
    fitTimestampToDate(decoded.firstRecordTimestamp) ||
    new Date();

  if (!summary.startTimeTs && !decoded.firstRecordTimestamp) {
    warnings.push('Timestamp mulai tidak ditemukan di FIT; tanggal diisi waktu saat ini.');
  }

  const elevationGainM =
    typeof summary.totalAscentM === 'number' && summary.totalAscentM > 0
      ? Math.round(summary.totalAscentM)
      : 0;

  const rideType = mapFitSportToLabel(summary.sport, summary.subSport);
  const roundedKm = Number(distanceKm.toFixed(2));

  if (roundedKm <= 0) {
    warnings.push('Jarak pada file FIT terdeteksi 0 km; periksa kembali atau isi manual.');
  }

  return {
    sourceFormat: 'fit',
    fileName: file.name,
    title: fallbackTitle,
    distanceKm: roundedKm,
    movingMinutes: Math.max(0, Math.round(movingSeconds / 60)),
    movingSeconds: Math.round(movingSeconds),
    elevationGainM,
    rideType,
    startDate: startDateObj,
    dateTimeLocal: formatLocalDateTimeInput(startDateObj),
    warnings
  };
}

export async function parseActivityFile(file) {
  if (!file) {
    throw new Error('Tidak ada file yang dipilih.');
  }

  const lowerName = (file.name || '').toLowerCase();
  if (lowerName.endsWith('.gpx')) {
    return parseGpxFile(file);
  }
  if (lowerName.endsWith('.fit')) {
    return parseFitFile(file);
  }

  throw new Error('Format file tidak didukung. Gunakan file berekstensi .gpx atau .fit.');
}