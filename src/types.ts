export interface Profile {
  name: string;
  path: string; // absolute
}

export interface ProfileSummary {
  name: string;
  path: string; // absolute
  isDefault: boolean;
}

export interface CreateOpts {
  /** Symlink auth.json from stock pi config. Default: true. */
  shareAuth?: boolean;
  /** Symlink models.json from stock pi config. Default: true. */
  shareModels?: boolean;
  /** Name of an existing profile to copy from. */
  from?: string;
  /** Copy from the stock ~/.pi/agent/ directory. */
  fromBase?: boolean;
}
