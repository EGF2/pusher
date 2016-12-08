"use strict";

const config = require("../components").config;
const log = require("../components").logger;
const auth = require("commons/auth");
const Primus = require("primus");
const rooms = require("primus-rooms");
const server = require("http").createServer();

let primus = new Primus(server, {
    pathname: "/v1/listen",
    transformer: "websockets",
    parser: "JSON"
    // timeout: false
});

primus.use("rooms", rooms);

let authclient = new auth.Client(config.auth);
primus.authorize(function(req, done) {
    authclient.checkToken(req).then(session => {
        req.session = session; // save session in request
        done();
    }).catch(err => {
        log.error(err);
        done({
            statusCode: err.status,
            message: err.message
        });
    });
});

primus.on("connection", spark => {
    // create room for each user_id
    spark.join(spark.request.session.user);
});

primus.on("error", err => {
    log.error(err);
});

server.listen(config.web_socket_port, () => {
    log.info(`linsten websocket port ${config.web_socket_port}`);
});

module.exports = primus;
