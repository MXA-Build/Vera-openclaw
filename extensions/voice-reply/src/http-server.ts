import http from "node:http";
import { URL } from "node:url";
import { normalizeOptionalString } from "../runtime-api.js";

export type VoiceReplyServerConfig = {
  port: number;
  bind: string;
  path: string;
  gatewayToken: string;
};

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

/** Result of generating a reply. spokenText is the TTS-shaped text (Phase 2); in
 * Phase 1 it equals text. An error carries an HTTP status the server returns. */
export type ReplyResult =
  | { spokenText?: string; text: string }
  | { error: string; status?: number };

export type ReplyHandler = (params: { text: string; from: string }) => Promise<ReplyResult>;

/**
 * Minimal synchronous HTTP listener for POST /reply. Mirrors the own-listener
 * pattern of extensions/voice-call; bearer-auth'd with OPENCLAW_GATEWAY_TOKEN.
 */
export class VoiceReplyServer {
  private server: http.Server | null = null;

  constructor(
    private readonly config: VoiceReplyServerConfig,
    private readonly onReply: ReplyHandler,
    private readonly logger: Logger,
  ) {}

  async start(): Promise<void> {
    if (this.server) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handle(req, res).catch((err) => {
          this.logger.error(`[voice-reply] request error: ${String(err)}`);
          this.send(res, 500, { error: "internal error" });
        });
      });
      server.on("error", reject);
      server.listen(this.config.port, this.config.bind, () => {
        this.logger.info(
          `[voice-reply] listening on ${this.config.bind}:${this.config.port}${this.config.path}`,
        );
        resolve();
      });
      this.server = server;
    });
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method !== "POST" || url.pathname !== this.config.path) {
      this.send(res, 404, { error: "not found" });
      return;
    }
    // Fail fast on auth: reject if no server token configured or a mismatch.
    if (!this.config.gatewayToken || this.bearer(req) !== this.config.gatewayToken) {
      this.send(res, 401, { error: "unauthorized" });
      return;
    }
    const raw = await this.readBody(req);
    let parsed: { text?: unknown; from?: unknown };
    try {
      parsed = JSON.parse(raw) as { text?: unknown; from?: unknown };
    } catch {
      this.send(res, 400, { error: "invalid json" });
      return;
    }
    const text = normalizeOptionalString(parsed.text) ?? "";
    const from = normalizeOptionalString(parsed.from) ?? "";
    if (!text) {
      this.send(res, 400, { error: "text is required" });
      return;
    }

    const result = await this.onReply({ text, from });
    if ("error" in result) {
      this.send(res, result.status ?? 500, { error: result.error });
      return;
    }
    this.logger.info(`[voice-reply] reply from=${from || "(none)"} chars=${result.text.length}`);
    this.send(res, 200, { spokenText: result.spokenText ?? result.text, text: result.text });
  }

  private bearer(req: http.IncomingMessage): string | undefined {
    const raw = req.headers.authorization ?? "";
    if (!raw.toLowerCase().startsWith("bearer ")) {
      return undefined;
    }
    return raw.slice(7).trim() || undefined;
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  }

  private send(res: http.ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  }
}
