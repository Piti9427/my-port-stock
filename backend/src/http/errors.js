"use strict";

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: "Not found", requestId: req.id });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = Number.isInteger(error.status) && error.status < 500
    ? error.status
    : 500;
  const message = status < 500 ? error.message : "Internal server error";

  return res.status(status).json({ error: message, requestId: req.id });
}

module.exports = {
  HttpError,
  errorHandler,
  notFoundHandler,
};
