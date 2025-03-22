import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { storage } from './storage';
import { User } from '@shared/schema';

/**
 * Service for handling Multi-Factor Authentication
 */
export class MfaService {
  /**
   * Generate a new MFA secret for a user
   * 
   * @param user The user to generate a secret for
   * @returns The secret and QR code data URL
   */
  async generateMfaSecret(user: User): Promise<{ secret: string; qrCodeUrl: string }> {
    const secret = speakeasy.generateSecret({
      name: `SupportAI:${user.username}`,
      length: 20,
    });

    // Generate QR code for the secret
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      qrCodeUrl
    };
  }

  /**
   * Verify a TOTP code against a user's MFA secret
   * 
   * @param user The user to verify
   * @param token The token to verify
   * @returns Whether the token is valid
   */
  verifyToken(user: User, token: string): boolean {
    if (!user.mfaSecret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });
  }

  /**
   * Enable MFA for a user
   * 
   * @param userId The ID of the user to enable MFA for
   * @param secret The MFA secret to use
   * @returns The updated user
   */
  async enableMfa(userId: number, secret: string): Promise<User> {
    // Generate backup codes
    const backupCodes = Array(8)
      .fill(0)
      .map(() => this.generateBackupCode());

    // Update the user with the new MFA information
    const updatedUser = await storage.updateUser(userId, {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaBackupCodes: backupCodes
    });

    return updatedUser;
  }

  /**
   * Disable MFA for a user
   * 
   * @param userId The ID of the user to disable MFA for
   * @returns The updated user
   */
  async disableMfa(userId: number): Promise<User> {
    const updatedUser = await storage.updateUser(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: []
    });

    return updatedUser;
  }

  /**
   * Verify a backup code for a user
   * 
   * @param user The user to verify
   * @param code The backup code to verify
   * @returns Whether the code is valid
   */
  async verifyBackupCode(user: User, code: string): Promise<boolean> {
    if (!user.mfaEnabled || !user.mfaBackupCodes) {
      return false;
    }

    const backupCodes = user.mfaBackupCodes as string[];
    const codeIndex = backupCodes.indexOf(code);

    if (codeIndex === -1) {
      return false;
    }

    // Remove the used backup code
    const updatedCodes = [...backupCodes];
    updatedCodes.splice(codeIndex, 1);

    // Update the user with the new backup codes
    await storage.updateUser(user.id, {
      mfaBackupCodes: updatedCodes
    });

    return true;
  }

  /**
   * Generate a new set of backup codes for a user
   * 
   * @param userId The ID of the user to generate backup codes for
   * @returns The new backup codes
   */
  async regenerateBackupCodes(userId: number): Promise<string[]> {
    const backupCodes = Array(8)
      .fill(0)
      .map(() => this.generateBackupCode());

    await storage.updateUser(userId, {
      mfaBackupCodes: backupCodes
    });

    return backupCodes;
  }

  /**
   * Generate a random backup code
   * 
   * @returns A backup code
   */
  private generateBackupCode(): string {
    // Generate a random 8-character code
    return Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
  }
}

// Singleton instance
let mfaService: MfaService | null = null;

/**
 * Get the MFA service instance
 * 
 * @returns The MFA service
 */
export function getMfaService(): MfaService {
  if (!mfaService) {
    mfaService = new MfaService();
  }
  return mfaService;
}