export interface IUpdate {
  pkg: { name: string; version: string };
  updateCheckInterval?: number;
  shouldNotifyInNpmScript?: boolean;
  distTag?: string;
  alwaysRun?: boolean;
  debug?: boolean;
}

export interface Message {
  role: string;
  content: string;
}
