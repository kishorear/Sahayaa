import { Request, Response } from 'express';
import { Express } from 'express';
import { getMfaService } from '../mfa-service';
import { User } from '@shared/schema';

/**
 * Register MFA-related routes
 * 
 * @param app Express application
 * @param requireAuth Auth middleware
 */
export function registerMfaRoutes(app: Express, requireAuth: any) {
  const mfaService = getMfaService();
  
  /**
   * Generate a new MFA secret and QR code
   * This doesn't enable MFA yet, just generates the initial setup
   */
  app.post('/api/mfa/setup', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Generate a new MFA secret
      const { secret, qrCodeUrl } = await mfaService.generateMfaSecret(user);
      
      return res.status(200).json({
        secret,
        qrCodeUrl
      });
    } catch (error) {
      console.error('Error setting up MFA:', error);
      return res.status(500).json({ message: 'Failed to set up MFA' });
    }
  });
  
  /**
   * Verify a TOTP code during the initial setup
   * This doesn't enable MFA yet, just verifies that the user correctly set up their authenticator app
   */
  app.post('/api/mfa/verify', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { token, secret } = req.body;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      if (!secret) {
        return res.status(400).json({ message: 'Secret is required' });
      }
      
      // Temporarily set the secret for verification, without saving it
      const tempUser = { ...user, mfaSecret: secret };
      
      // Verify the token
      const isValid = mfaService.verifyToken(tempUser, token);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid token' });
      }
      
      return res.status(200).json({ message: 'Token is valid' });
    } catch (error) {
      console.error('Error verifying MFA token:', error);
      return res.status(500).json({ message: 'Failed to verify MFA token' });
    }
  });
  
  /**
   * Enable MFA for a user
   * This permanently enables MFA and stores the secret in the database
   */
  app.post('/api/mfa/enable', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { token, secret } = req.body;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      if (!secret) {
        return res.status(400).json({ message: 'Secret is required' });
      }
      
      // Temporarily set the secret for verification, without saving it
      const tempUser = { ...user, mfaSecret: secret };
      
      // Verify the token
      const isValid = mfaService.verifyToken(tempUser, token);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid token' });
      }
      
      // Enable MFA for the user
      const updatedUser = await mfaService.enableMfa(user.id, secret);
      
      // Remove sensitive fields before returning to client
      const { password, mfaSecret, ...userWithoutSensitiveData } = updatedUser;
      
      return res.status(200).json({
        ...userWithoutSensitiveData,
        backupCodes: updatedUser.mfaBackupCodes // Send backup codes for initial setup
      });
    } catch (error) {
      console.error('Error enabling MFA:', error);
      return res.status(500).json({ message: 'Failed to enable MFA' });
    }
  });
  
  /**
   * Disable MFA for a user
   */
  app.post('/api/mfa/disable', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { token } = req.body;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: 'MFA is not enabled' });
      }
      
      // Verify the token if provided
      if (token) {
        const isValid = mfaService.verifyToken(user, token);
        
        if (!isValid) {
          return res.status(400).json({ message: 'Invalid token' });
        }
      }
      
      // Disable MFA for the user
      const updatedUser = await mfaService.disableMfa(user.id);
      
      // Remove sensitive fields before returning to client
      const { password, mfaSecret, ...userWithoutSensitiveData } = updatedUser;
      
      return res.status(200).json(userWithoutSensitiveData);
    } catch (error) {
      console.error('Error disabling MFA:', error);
      return res.status(500).json({ message: 'Failed to disable MFA' });
    }
  });
  
  /**
   * Regenerate backup codes for a user
   */
  app.post('/api/mfa/backup-codes/regenerate', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { token } = req.body;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: 'MFA is not enabled' });
      }
      
      // Verify the token if provided
      if (token) {
        const isValid = mfaService.verifyToken(user, token);
        
        if (!isValid) {
          return res.status(400).json({ message: 'Invalid token' });
        }
      }
      
      // Regenerate backup codes
      const backupCodes = await mfaService.regenerateBackupCodes(user.id);
      
      return res.status(200).json({ backupCodes });
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      return res.status(500).json({ message: 'Failed to regenerate backup codes' });
    }
  });
  
  /**
   * Verify a MFA token (for use during login or sensitive operations)
   */
  app.post('/api/mfa/validate-token', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { token } = req.body;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: 'MFA is not enabled' });
      }
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      // Verify the token
      const isValid = mfaService.verifyToken(user, token);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid token' });
      }
      
      return res.status(200).json({ message: 'Token is valid' });
    } catch (error) {
      console.error('Error validating MFA token:', error);
      return res.status(500).json({ message: 'Failed to validate MFA token' });
    }
  });
  
  /**
   * Verify a backup code (alternative to TOTP during login)
   */
  app.post('/api/mfa/validate-backup-code', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const { code } = req.body;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: 'MFA is not enabled' });
      }
      
      if (!code) {
        return res.status(400).json({ message: 'Backup code is required' });
      }
      
      // Verify the backup code
      const isValid = await mfaService.verifyBackupCode(user, code);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid backup code' });
      }
      
      return res.status(200).json({ message: 'Backup code is valid' });
    } catch (error) {
      console.error('Error validating backup code:', error);
      return res.status(500).json({ message: 'Failed to validate backup code' });
    }
  });
}