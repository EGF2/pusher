"use strict";

const clientData = require("../components").clientData;
const services = require("../services");

// add "<method> <object or edge>": <handler>
const handleRegistry = {
};

function eventHandler(event) {
    if (services.websocket) {
        services.websocket.handleEvent(event);
    }

    return Promise.resolve(event.method).then(method => {
        if (event.object) {
            if (event.current) {
                return `${method} ${event.current.object_type}`;
            }
            return `${method} ${event.previous.object_type}`;
        }
        return Promise.all([
            clientData.getObjectType(event.edge.src),
            clientData.getObjectType(event.edge.dst)
        ]).then(types => `${method} ${types[0]}/${event.edge.name}/%{types[1]}`);
    }).then(path => path in handleRegistry ? handleRegistry[path](event) : undefined);
}
module.exports = eventHandler;
