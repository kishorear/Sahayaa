import { Router, Request, Response } from "express";
import { getUserPermissions, getAvailableRolesForTenant } from "../permissions";

const router = Router();

/**
 * Get current user's permissions
 */
router.get("/api/permissions/me", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const permissions = await getUserPermissions(req.user.id);
    if (!permissions) {
      return res.status(404).json({ message: "Permissions not found" });
    }

    res.json(permissions);
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ message: "Failed to fetch permissions" });
  }
});

/**
 * Get available roles for current tenant's industry
 */
router.get("/api/permissions/available-roles", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const roles = await getAvailableRolesForTenant(req.user.tenantId);
    res.json(roles);
  } catch (error) {
    console.error("Error fetching available roles:", error);
    res.status(500).json({ message: "Failed to fetch available roles" });
  }
});

export default router;
