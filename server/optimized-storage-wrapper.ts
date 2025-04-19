// Optimized storage wrapper to add caching
import { storage } from "./storage";
import { User, Tenant, Team, Ticket, Message } from "@shared/schema";

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Maximum items in each cache

// Cache objects
const userCache = new Map<number, { data: User; timestamp: number }>();
const userByUsernameCache = new Map<string, { userId: number; timestamp: number }>();
const tenantCache = new Map<number, { data: Tenant; timestamp: number }>();
const teamCache = new Map<number, { data: Team; timestamp: number }>();
const ticketCache = new Map<number, { data: Ticket; timestamp: number }>();

// Create optimized storage wrapper with caching
export const optimizedStorage = {
  // User operations with caching
  getUser: async (id: number): Promise<User | undefined> => {
    const now = Date.now();
    const cached = userCache.get(id);
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    
    const user = await storage.getUser(id);
    if (user) {
      userCache.set(id, { data: user, timestamp: now });
    }
    
    return user;
  },
  
  getUserByUsername: async (username: string, tenantId?: number): Promise<User | undefined> => {
    const now = Date.now();
    const cacheKey = tenantId ? `${username}:${tenantId}` : username;
    const cached = userByUsernameCache.get(cacheKey);
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      const userCached = userCache.get(cached.userId);
      if (userCached && (now - userCached.timestamp) < CACHE_TTL) {
        return userCached.data;
      }
    }
    
    const user = await storage.getUserByUsername(username, tenantId);
    if (user) {
      userCache.set(user.id, { data: user, timestamp: now });
      userByUsernameCache.set(cacheKey, { userId: user.id, timestamp: now });
    }
    
    return user;
  },
  
  createUser: async (user: any): Promise<User> => {
    // Always invalidate cache for newly created users
    const newUser = await storage.createUser(user);
    userCache.set(newUser.id, { data: newUser, timestamp: Date.now() });
    return newUser;
  },
  
  updateUser: async (id: number, updates: Partial<User>): Promise<User> => {
    // Invalidate cache when updating
    userCache.delete(id);
    
    // Also invalidate username cache entries for this user
    for (const [key, value] of userByUsernameCache.entries()) {
      if (value.userId === id) {
        userByUsernameCache.delete(key);
      }
    }
    
    const updatedUser = await storage.updateUser(id, updates);
    userCache.set(id, { data: updatedUser, timestamp: Date.now() });
    return updatedUser;
  },
  
  // Tenant operations with caching
  getTenantById: async (id: number): Promise<Tenant | undefined> => {
    const now = Date.now();
    const cached = tenantCache.get(id);
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    
    const tenant = await storage.getTenantById(id);
    if (tenant) {
      tenantCache.set(id, { data: tenant, timestamp: now });
    }
    
    return tenant;
  },
  
  // Team operations with caching
  getTeamById: async (id: number, tenantId?: number): Promise<Team | undefined> => {
    const now = Date.now();
    const cached = teamCache.get(id);
    
    // Only use cache if tenant matches or if no tenant was specified
    if (cached && (now - cached.timestamp) < CACHE_TTL && 
        (!tenantId || cached.data.tenantId === tenantId)) {
      return cached.data;
    }
    
    const team = await storage.getTeamById(id, tenantId);
    if (team) {
      teamCache.set(id, { data: team, timestamp: now });
    }
    
    return team;
  },
  
  // Pass through other operations to original storage
  // This ensures all operations are available while we optimize high-volume ones
  ...storage
};

// Periodically clean up expired cache entries
setInterval(() => {
  const now = Date.now();
  
  // Clean user cache
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
  
  // Clean username cache
  for (const [key, value] of userByUsernameCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userByUsernameCache.delete(key);
    }
  }
  
  // Clean tenant cache
  for (const [key, value] of tenantCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      tenantCache.delete(key);
    }
  }
  
  // Clean team cache
  for (const [key, value] of teamCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      teamCache.delete(key);
    }
  }
  
  // Clean ticket cache
  for (const [key, value] of ticketCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      ticketCache.delete(key);
    }
  }
  
  // Enforce cache size limits
  if (userCache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries if cache is too large
    const entries = Array.from(userCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, entries.length - MAX_CACHE_SIZE).forEach(([key]) => {
      userCache.delete(key);
    });
  }
}, 60000); // Run every minute