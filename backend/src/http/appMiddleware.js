"use strict";

const { randomUUID } = require("node:crypto");

function requestContext(req, res, next) {
  const startedAt = Date.now();
  req.id = randomUUID();
  res.setHeader("X-Request-ID", req.id);

  res.on("finish", () => {
    console.log(JSON.stringify({
      type: "http_request",
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });

  next();
}

module.exports = { requestContext };
