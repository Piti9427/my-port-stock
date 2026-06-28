"use strict";

const { randomUUID } = require("node:crypto");

const DEFAULT_TTL_MS = 30_000;
const DEFAULT_MAX_PENDING = 1_000;

class WsTicketStore {
  constructor({ now = Date.now, ttlMs = DEFAULT_TTL_MS, maxPending = DEFAULT_MAX_PENDING } = {}) {
    this.now = now;
    this.ttlMs = ttlMs;
    this.maxPending = maxPending;
    this.tickets = new Map();
  }

  issue(userId) {
    if (typeof userId !== "string" || !userId.trim()) {
      throw new TypeError("WebSocket ticket requires a user ID");
    }

    this.removeExpired();
    const ticket = randomUUID();
    this.tickets.set(ticket, {
      ticketId: ticket,
      userId,
      expiresAt: this.now() + this.ttlMs,
    });

    while (this.tickets.size > this.maxPending) {
      this.tickets.delete(this.tickets.keys().next().value);
    }

    return { ticket, expiresInSeconds: Math.floor(this.ttlMs / 1000) };
  }

  consume(ticket) {
    const record = this.tickets.get(ticket);
    if (!record) return null;

    this.tickets.delete(ticket);
    return record.expiresAt > this.now() ? record.userId : null;
  }

  removeExpired() {
    const now = this.now();
    for (const [ticket, record] of this.tickets) {
      if (record.expiresAt <= now) this.tickets.delete(ticket);
    }
  }

  get size() {
    return this.tickets.size;
  }
}

module.exports = { WsTicketStore };
