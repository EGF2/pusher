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

let resolver = {};

primus.use("rooms", rooms);

let authclient = new auth.Client(config.auth);
primus.authorize((req, done) => {
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

    // handle message from client
    spark.on("data", data => {
        if (data.subscribe) {
            data.subscribe.forEach(subscribe => {
                let path = subscribe.object_id ||
                    `${subscribe.edge.source}\${subscribe.edge.name}`;
                resolver[path] = resolver[path] || {};
                resolver[path][spark.request.session.user] = true;
            });
        } else if (data.unsubscribe) {
            data.unsubscribe.forEach(unsubscribe => {
                let path = unsubscribe.object_id ||
                    `${unsubscribe.edge.source}\${unsubscribe.edge.name}`;
                if (resolver[path]) {
                    delete resolver[path][spark.request.session.user];
                    if (Object.keys(resolver[path]).length === 0) {
                        delete resolver[path];
                    }
                }
            });
        }
    });
});

primus.on("error", err => {
    log.error(err);
});

server.listen(config.web_socket_port, () => {
    log.info(`linsten websocket port ${config.web_socket_port}`);
});

function handleEvent(event) {
    let subscription = event.object || `${event.edge.src}\${event.edge.name}`;
    if (subscription in resolver) {
        primus.in(Object.keys(resolver[subscription]).join(" ")).write(event);
    }
}

module.exports = {
    ws: primus,
    handleEvent
};
