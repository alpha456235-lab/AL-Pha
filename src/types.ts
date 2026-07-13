export interface VPNServer {
  ServerName?: string;
  ServerIP?: string;
  ServerUser?: string;
  ServerPass?: string;
  Payload?: string;
  SNI?: string;
  udpserver?: string;
  udpobfs?: string;
  v2rayJson?: string;
  ServerPort?: string | number;
  ProxyPort?: string | number;
  Type?: string;
  Country?: string;
  [key: string]: any;
}

export type CryptoMode = 'alpha' | 'openssl' | 'ehi' | 'darktunnel' | 'npvt';

export interface LicenseStatus {
  type: 'alpha' | 'vip';
  activatedAt: number;
  expiresAt: number | null;
  valid: boolean;
}
