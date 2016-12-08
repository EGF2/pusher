"use strict";

let config = require("../components").config;

if (config.email_transport) {
    module.exports.sendEmail = require("./email").sendEmail;
}

if (config.web_socket_port) {
    module.exports.websocket = require("./websocket");
}
