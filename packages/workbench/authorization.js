import fs from 'node:fs';
import {timingSafeEqual} from 'node:crypto';
// No header-based loopback bypass: every browser route needs both gates.
export function createAuthorizer(connection, gateState) {
  return req => {
    try {
      const admission = connection.admit(req);
      if (!admission || typeof admission !== 'object' || 'rejection' in admission) return false;
      const cookies = [...String(req.headers.cookie || '').matchAll(/(?:^|;\s*)lg_device=([^;]+)/g)];
      if (cookies.length !== 1 || cookies[0][1].length > 256) return false;
      const candidate = Buffer.from(cookies[0][1]);
      const state = JSON.parse(fs.readFileSync(gateState, 'utf8'));
      return Object.values(state.devices || {}).some(device => {
        if (!device || (device.role || 'web') !== 'web' || typeof device.token !== 'string') return false;
        const token = Buffer.from(device.token);
        return token.length === candidate.length && timingSafeEqual(token, candidate);
      });
    } catch { return false; }
  };
}
