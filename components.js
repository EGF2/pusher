"use strict";

const option = require("commons/option");
const bunyan = require("bunyan");
const sendgrid = require("sendgrid");

function init() {
    return option().config.then(config => {
        module.exports.config = config;
        let cd = require("commons/client-data")(config["client-data"]);
        module.exports.clientData = cd;
        module.exports.logger = bunyan.createLogger({
            name: "pusher",
            level: config.log_level
        });
        let promises = [];
        if (config.email_transport === "sendgrid") {
            let sg = cd.getGraphConfig().then(conf =>
                cd.getObject(conf.objects.secret_organization)
                    .then(secret => {
                        let apiKey = secret.secret_keys.find(item => item.key === "sendgrid_api_key");
                        module.exports.sendgrid = sendgrid(apiKey.value);
                    })
            );
            promises.push(sg);
        }
        return Promise.all(promises);
    })
    .then(() => module.exports)
    .catch(err => {
        console.log(err);
        process.exit(1);
    });
}

module.exports = {
    init
};
