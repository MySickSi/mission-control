#!/usr/bin/env node

/**
 * Domain Manager
 * Monitors domain health, SSL certificates, DNS, and VPN status
 */

const https = require('https');
const dns = require('dns').promises;
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DOMAINS = [
  {
    name: 'alienlabs.win',
    type: 'website',
    description: 'Main Website',
    icon: '🌐'
  },
  {
    name: 'remote.alienlabs.win',
    type: 'vpn',
    description: 'Remote VPN Connection',
    icon: '🔐'
  }
];

/**
 * Check domain HTTP status
 */
async function checkDomainStatus(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      resolve({
        domain,
        statusCode: res.statusCode,
        status: res.statusCode >= 200 && res.statusCode < 400 ? 'online' : 'offline',
        lastCheck: new Date().toISOString()
      });
    });

    req.on('error', () => {
      resolve({
        domain,
        status: 'offline',
        error: 'Connection failed',
        lastCheck: new Date().toISOString()
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        domain,
        status: 'offline',
        error: 'Timeout',
        lastCheck: new Date().toISOString()
      });
    });

    req.end();
  });
}

/**
 * Get SSL certificate info using openssl
 */
async function checkSSLCertificate(domain) {
  try {
    const output = execSync(`echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates -subject`, {
      encoding: 'utf-8',
      timeout: 10000
    });

    const notAfterMatch = output.match(/notAfter=(.+)/);
    const subjectMatch = output.match(/subject=(.+)/);

    if (notAfterMatch) {
      const expiryDate = new Date(notAfterMatch[1]);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

      let status = 'valid';
      if (daysUntilExpiry < 0) {
        status = 'expired';
      } else if (daysUntilExpiry < 30) {
        status = 'expiring-soon';
      }

      return {
        domain,
        status,
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry,
        subject: subjectMatch ? subjectMatch[1].trim() : 'Unknown'
      };
    }

    return {
      domain,
      status: 'unknown',
      error: 'Could not parse certificate'
    };
  } catch (err) {
    return {
      domain,
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Check DNS resolution
 */
async function checkDNS(domain) {
  try {
    const records = await dns.resolve4(domain);
    return {
      domain,
      status: 'resolved',
      records: records,
      lastCheck: new Date().toISOString()
    };
  } catch (err) {
    return {
      domain,
      status: 'unresolved',
      error: err.message,
      lastCheck: new Date().toISOString()
    };
  }
}

/**
 * Check VPN connection status (for remote.alienlabs.win)
 */
async function checkVPNStatus(domain) {
  try {
    // Try to ping the VPN endpoint
    const result = execSync(`ping -c 1 -W 2 ${domain} 2>/dev/null || echo "offline"`, {
      encoding: 'utf-8',
      timeout: 5000
    });

    const isOnline = !result.includes('offline') && result.includes('bytes from');
    
    return {
      domain,
      type: 'vpn',
      status: isOnline ? 'online' : 'offline',
      lastCheck: new Date().toISOString()
    };
  } catch (err) {
    return {
      domain,
      type: 'vpn',
      status: 'unknown',
      error: err.message,
      lastCheck: new Date().toISOString()
    };
  }
}

/**
 * Get full domain status
 */
async function getDomainStatus(domainConfig) {
  const [httpStatus, ssl, dns, vpn] = await Promise.all([
    checkDomainStatus(domainConfig.name),
    checkSSLCertificate(domainConfig.name),
    checkDNS(domainConfig.name),
    domainConfig.type === 'vpn' ? checkVPNStatus(domainConfig.name) : Promise.resolve(null)
  ]);

  return {
    name: domainConfig.name,
    type: domainConfig.type,
    description: domainConfig.description,
    icon: domainConfig.icon,
    http: httpStatus,
    ssl,
    dns,
    vpn: vpn,
    overallStatus: httpStatus.status === 'online' && ssl.status !== 'expired' ? 'healthy' : 'warning',
    lastCheck: new Date().toISOString()
  };
}

/**
 * Main: Get all domain statuses
 */
async function getAllDomains() {
  console.log(`[${new Date().toISOString()}] Domain Manager: Checking domains...`);

  try {
    const statuses = await Promise.all(
      DOMAINS.map(domain => getDomainStatus(domain))
    );

    console.log(`✓ Domain Manager: Checked ${statuses.length} domains`);

    return {
      success: true,
      domains: statuses,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Domain Manager Error:', err.message);
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for module use
module.exports = { getDomainStatus, getAllDomains, DOMAINS };

// Execute if run directly
if (require.main === module) {
  getAllDomains().then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}
