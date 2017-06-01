/*jslint node:true, nomen: true*/

var http = require('http');

var socketio = require('socket.io');
var express = require('express');

var fs = require('fs');
var readline = require('readline');
var path = require('path');

var config = require('./config.json');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
var dirname = __dirname;
router.use("/angular", express['static'](path.resolve(dirname, "node_modules/angular")));
router.use("/angular-sanitize", express['static'](path.resolve(dirname, "node_modules/angular-sanitize")));
router.use("/angular-animate", express['static'](path.resolve(dirname, "node_modules/angular-animate")));
router.use("/angular-aria", express['static'](path.resolve(dirname, "node_modules/angular-aria")));
router.use("/angular-material", express['static'](path.resolve(dirname, "node_modules/angular-material")));
router.use("/angular-material-datetimepicker", express['static'](path.resolve(dirname, "node_modules/ng-material-datetimepicker/dist")));
router.use("/moment", express['static'](path.resolve(dirname, "node_modules/moment")));
router.use(express['static'](path.resolve(dirname, 'client')));

function exists(regex, text) {
    'use strict';
    regex = regex.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
    return new RegExp(regex).test(text);
}

function findInFile(socket, appName, actualPath, expressions, dateTimeStart, dateTimeEnd) {
    'use strict';
    var rd = readline.createInterface({
        input: fs.createReadStream(actualPath)
    });
    rd.on('line', function (line) {
        var lineObj = {
            line: line,
            tabIds: []
        };
        expressions.forEach(function (expression) {
            if (exists(expression, line)) {
                lineObj.tabIds.push(appName + ":" + expression);
            }
        });
        if (lineObj.tabIds.length > 0) {
            socket.emit('putInTabs', lineObj);
        }
    });
}

function findRecursiveApp(socket, appName, actualPath, expressions, dateTimeStart, dateTimeEnd) {
    'use strict';
    fs.readdir(actualPath, function (err, files) {
        files.forEach(function (file) {
            fs.lstat(path.join(actualPath, file), function (err, stats) {
                if (stats.isDirectory()) {
                    findRecursiveApp(socket, appName, path.join(actualPath, file), expressions, dateTimeStart, dateTimeEnd);
                } else if (path.extname(file) === '.log' && stats.mtime > dateTimeStart && stats.mtime < dateTimeEnd) {
                    findInFile(socket, appName, path.join(actualPath, file), expressions, dateTimeStart, dateTimeEnd);
                }
            });
        });
    });
}

io.on('connection', function (socket) {
    'use strict';

    socket.on('listApps', function () {
        socket.emit('listApps', fs.readdirSync(config.pastaBase).filter(function (file) {
            return fs.lstatSync(path.join(config.pastaBase, file)).isDirectory();
        }));
    });

    socket.on('pesquisar', function (query) {
        query.apps.forEach(function (app) {
            if (app) {
                findRecursiveApp(socket, app, path.join(config.pastaBase, app), query.expressions, query.dateTimeStart, query.dateTimeEnd);
            }
        });
    });
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function () {
    'use strict';
    var addr = server.address();
    console.log("Chat server listening at", addr.address + ":" + addr.port);
});
