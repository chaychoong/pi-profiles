import { ProfileManager } from "../profile-manager.js";

export function createProfileManager(): ProfileManager {
  return new ProfileManager(process.env.PPI_PI_ROOT);
}
