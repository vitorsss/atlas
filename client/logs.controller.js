(function (angular, io, console) {
    'use strict';
    angular.module('atlas', ['ngMaterial', 'ngSanitize', 'ngMaterialDatePicker']).controller('LogsController', ['$scope', '$filter', '$timeout', function ($scope, $filter, $timeout) {
        var socket = io.connect(),
            controller = this;

        controller.expressions = [];
        controller.apps = [];
        controller.tabs = [];
        controller.selectedApps = [];
        controller.pesquisando = false;

        controller.pesquisar = function () {
            if (controller.pesquisando) {
                return;
            } else if (controller.expressions.length > 0 && controller.dateTimeStart && controller.dateTimeEnd && controller.selectedApps.length > 0) {
                //controller.pesquisando = true;
                socket.emit('pesquisar', {
                    apps: controller.selectedApps,
                    expressions: controller.expressions,
                    dateTimeStart: controller.dateTimeStart.getTime(),
                    dateTimeEnd: controller.dateTimeEnd.getTime()
                });
            }
        };

        controller.removeTab = function (tab) {
            controller.tabs.splice(controller.tabs.indexOf(tab), 1);
        };

        controller.tratarTab = function (tab) {
            tab.content = $filter('orderBy')(tab.lines).join('\n');
            tab.highlights.forEach(function (search, index) {
                tab.content = tab.content.replace(new RegExp(search, 'g'), '<span class="ç' + index + '">' + search + '</span>');
            });
        };

        controller.tratarTabs = function () {
            if (controller.tabPromise) {
                $timeout.cancel(controller.tabPromise);
            }
            controller.tabPromise = $timeout(function () {
                controller.tabs.forEach(function (tab) {
                    controller.tratarTab(tab);
                });
            }, 250);
        };

        socket.on('putInTabs', function (line) {
            controller.pesquisando = false;
            var tabIdsPreenchidos = [];
            controller.tabs.forEach(function (tab) {
                if (tab && line.tabIds.indexOf(tab.id) >= 0) {
                    tabIdsPreenchidos.push(tab.id);
                    tab.lines.push(line.line);
                }
            });
            line.tabIds.forEach(function (tabId) {
                if (tabIdsPreenchidos.indexOf(tabId) < 0) {
                    controller.tabs.push({
                        id: tabId,
                        lines: [line.line],
                        content: "",
                        highlights: [tabId.split(":")[1]]
                    });
                }
            });
            controller.tratarTabs();
        });

        socket.on('listApps', function (apps) {
            controller.apps = apps;
        });

        socket.emit('listApps');
    }]);
}(window.angular, window.io, window.console));
