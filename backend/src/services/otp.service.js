const crypto = require('crypto');

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function normalizeMobile(value) {
  return String(value || '').replace(/\s+/g, '').replace(/^00/, '+');
}

async function deliverOtp(destination, code) {
  const provider = String(process.env.SMS_PROVIDER || 'console').toLowerCase();
  if (provider === 'console' || !process.env.SMS_PROVIDER_API_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CampusPulse+ OTP] ${destination}: ${code}`);
      return { delivered: true, mode: 'console' };
    }
    return { delivered: false, mode: 'not_configured' };
  }

  // Provider-ready abstraction. Keep credentials out of source control.
  // MSG91 can be wired here without changing the auth contract.
  if (provider === 'msg91') {
    const https = require('https');
    const authkey = process.env.MSG91_AUTH_KEY || process.env.SMS_PROVIDER_API_KEY;
    const sender = process.env.MSG91_SENDER_ID || 'CPPLUS';
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authkey || !templateId) return { delivered: false, mode: 'not_configured' };

    const body = JSON.stringify({ mobile: normalizeMobile(destination).replace('+', ''), otp: code, template_id: templateId });
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'control.msg91.com',
        path: '/api/v5/otp',
        method: 'POST',
        headers: { authkey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let text = '';
        res.on('data', (d) => { text += d; });
        res.on('end', () => res.statusCode >= 200 && res.statusCode < 300 ? resolve() : reject(new Error(`MSG91 returned ${res.statusCode}: ${text}`)));
      });
      req.on('error', reject); req.write(body); req.end();
    });
    return { delivered: true, mode: 'msg91', sender };
  }

  return { delivered: false, mode: 'unsupported_provider' };
}

module.exports = { hashCode, normalizeMobile, deliverOtp };
