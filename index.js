"use strict";

const restify = require("restify");
const components = require("./components");
const eventConsumer = require("commons/event-consumer");

components.init().then(comp => {
    const config = comp.config;
    const services = require("./services");
    const log = comp.logger;

    if (config.port && config.email_transport) {
        let server = restify.createServer({
            name: "pusher"
        });

        server.use(restify.queryParser());
        server.use(restify.bodyParser());
        server.use(restify.requestLogger());

        server.post("/v1/internal/send_email", (req, res, next) => {
            try {
                services.sendEmail(req.params)
                    .then(() => res.send(200))
                    .catch(next);
            } catch (err) {
                next(err);
            }
        });

        server.listen(comp.config.port, () => {
            log.info(`listen http port ${comp.config.port}`);
        });
    }

    if (config.queue) {
        let eventHandler = require("./extra");

        const errorHandler = error => {
            log.error(error);
        };

        eventConsumer(config, eventHandler, errorHandler);
        log.info(`listen events from ${config.queue}`);
    }
});
