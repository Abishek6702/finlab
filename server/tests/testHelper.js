const { EventEmitter } = require("events");

/**
 * Invoke Express request directly in-memory without TCP sockets
 */
function mockRequest(app, { method = "GET", url = "/", headers = {}, body = null, cookies = null }) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;
    req.headers = { ...headers };
    req.connection = { remoteAddress: "127.0.0.1" };
    req.socket = req.connection;
    req.ip = "127.0.0.1";

    if (cookies) {
      req.headers["cookie"] = cookies;
    }

    if (body) {
      req.body = body;
    } else {
      req.body = {};
    }

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.headersSent = false;

    res.setHeader = (key, value) => {
      res._headers[key.toLowerCase()] = value;
    };
    res.getHeader = (key) => res._headers[key.toLowerCase()];
    res.removeHeader = (key) => {
      delete res._headers[key.toLowerCase()];
    };

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    res.cookie = (name, val, options) => {
      res._headers["set-cookie"] = `${name}=${val}; Path=${options.path || "/"}`;
      return res;
    };

    res.clearCookie = (name, options) => {
      res._headers["set-cookie"] = `${name}=; Path=${options.path || "/"}; Max-Age=0`;
      return res;
    };

    res.send = (data) => {
      res.headersSent = true;
      let parsed = data;
      if (typeof data === "string") {
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
      }
      resolve({
        status: res.statusCode,
        headers: res._headers,
        cookies: res._headers["set-cookie"] ? [res._headers["set-cookie"]] : [],
        body: parsed,
      });
    };

    res.json = (data) => {
      res.setHeader("content-type", "application/json");
      res.send(data);
    };

    res.end = (chunk) => {
      if (!res.headersSent) {
        res.send(chunk || "");
      }
    };

    app.handle(req, res);
  });
}

module.exports = { mockRequest };
