"use strict";

const config = require("../components").config;
const templates = require("../templates/config");
const sendgrid = require("../components").sendgrid;
const swig = require("swig");
const _ = require("lodash");
const log = require("../components").logger;
const restify = require("restify");
const util = require("util");

exports.sendEmail = function(email) {
    let to = email.to;
    let from = email.from;
    let templateId = email.template;

    if (!to) {
        throw new MissingParameter("to");
    }
    if (!from) {
        throw new MissingParameter("from");
    }
    if (!templateId) {
        throw new MissingParameter("template");
    }

    let template = templates.emails[templateId];
    if (!template) {
        throw new IncorrectTemplateName(templateId);
    }

    let params = email.params;
    let props = Object.keys(params);
    let missed = template.params.find(p => props.indexOf(p) < 0);
    if (missed) {
        throw new MissingParameter(`params.${missed}`);
    }

    let file = {};
    if (params.attachment) {
        file.content = new Buffer(params.attachment, "base64");
        file.filename = params.filename;

        delete params.filename;
        delete params.attachment;
    }

    params = _.merge(params, {host: config.template_host});
    let content = swig.renderFile("./templates/html/" + template.template, params);

    let subject = swig.render(email.params.subject || template.subject, {locals: params});
    let e = {
        to: to,
        from: from,
        subject: subject,
        html: content
    };

    if (Object.keys(file).length) {
        e.files = [file];
    }

    let domain = to.split("@")[1];
    if (config.ignored_domains.indexOf(domain) !== -1) {
        log.info("skip sending to " + to);
        return Promise.resolve();
    }

    let sendgridEmail = new sendgrid.Email(e);
    return new Promise((resolve, reject) =>
        sendgrid.send(sendgridEmail, error => {
            if (error) {
                log.error("send email error: ", error);
                reject(error);
            }
            resolve();
        })
    ).then(() => log.info("email sent to " + to));
};

// ---------- Errors ----------

function MissingParameter(param) {
    restify.RestError.call(this, {
        restCode: "MissingParameter",
        statusCode: 400,
        message: `Required parameter "${param}" is missed`,
        constructorOpt: MissingParameter
    });
    this.name = "MissingParameter";
}
util.inherits(MissingParameter, restify.RestError);

function IncorrectTemplateName(tpl) {
    restify.RestError.call(this, {
        restCode: "IncorrectTemplateName",
        statusCode: 400,
        message: `Incorrect template name '${tpl}'`,
        constructorOpt: IncorrectTemplateName
    });
    this.name = "IncorrectTemplateName";
}
util.inherits(IncorrectTemplateName, restify.RestError);
