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
}

export interface CloneOpts {
  /**
   * When true (default), preserve the source's auth.json as-is (symlink or file).
   * When false (--own-auth), dereference any symlink into an independent copy.
   */
  shareAuth?: boolean;
  /**
   * When true (default), preserve the source's models.json as-is (symlink or file).
   * When false (--own-models), dereference any symlink into an independent copy.
   */
  shareModels?: boolean;
}
