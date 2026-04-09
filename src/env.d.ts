/// <reference types="@cloudflare/workers-types" />

type CloudflareLocals = import('@astrojs/cloudflare').Runtime<{
  DB: D1Database;
}>;

declare namespace App {
  interface Locals extends CloudflareLocals {}
}
