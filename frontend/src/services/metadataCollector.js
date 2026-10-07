// Generates a simple, robust deterministic hash for device fingerprinting
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'fp_' + Math.abs(hash).toString(16);
}

// Generate Canvas Fingerprint
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_na';
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('AegisUPI,AI@2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('AegisUPI,AI@2026', 4, 17);
    return hashString(canvas.toDataURL());
  } catch (e) {
    return 'canvas_error';
  }
}

// Detect Browser Name & Version
export function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/')) return 'Google Chrome';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Apple Safari';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Modern Web Browser';
}

// Detect Operating System
export function detectOS() {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows 11 / 10';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Android')) return 'Android Mobile';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown OS';
}

// Collect all device & environment metadata automatically
export async function collectDeviceMetadata() {
  const now = new Date();
  const screenRes = `${window.screen.width || 1920}x${window.screen.height || 1080}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const language = navigator.language || 'en-US';
  const browser = detectBrowser();
  const os = detectOS();
  const canvasHash = getCanvasFingerprint();

  // Combine hardware and browser signals to build fingerprint
  const rawFpString = [
    browser,
    os,
    screenRes,
    navigator.hardwareConcurrency || 8,
    navigator.deviceMemory || 8,
    canvasHash,
    language
  ].join('|');
  const deviceFingerprint = hashString(rawFpString);

  // Network connection type
  let networkType = '4g';
  if (navigator.connection && navigator.connection.effectiveType) {
    networkType = navigator.connection.effectiveType;
  }

  // Battery level
  let batteryLevel = 0.85;
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      batteryLevel = Math.round(b.level * 100) / 100;
    }
  } catch (e) {
    batteryLevel = 0.85;
  }

  // Geolocation (Attempt with short 1.5s timeout; fallback gracefully)
  let gpsCoords = { lat: 12.9716, lon: 77.5946, city: 'Bengaluru (HQ)' };
  try {
    if (navigator.geolocation) {
      const position = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 1200);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve(pos);
          },
          () => {
            clearTimeout(timer);
            resolve(null);
          },
          { timeout: 1200, maximumAge: 60000 }
        );
      });
      if (position && position.coords) {
        gpsCoords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          city: 'Detected GPS Location'
        };
      }
    }
  } catch (e) {
    // fallback
  }

  return {
    timestamp: now.toISOString(),
    hour: now.getHours(),
    timezone,
    browser,
    os,
    screen_resolution: screenRes,
    language,
    device_fingerprint: deviceFingerprint,
    network_type: networkType,
    battery_level: batteryLevel,
    gps_lat: gpsCoords.lat,
    gps_lon: gpsCoords.lon,
    city: gpsCoords.city,
    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  };
}
