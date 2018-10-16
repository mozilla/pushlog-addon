/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let idUrl = {};
let port = null;
const anchorPat = new RegExp("#[^/]*$");

function menuHandler(info, tab) {
  if (idUrl.hasOwnProperty(info.menuItemId)) {
    browser.tabs.query({active: true,
                        windowId: browser.windows.WINDOW_ID_CURRENT})
           .then(tabs => browser.tabs.get(tabs[0].id))
           .then(tab => {
             browser.tabs.create({index: tab.index + 1,
                                  url: idUrl[info.menuItemId]});             
           });
  }
}

function init() {
  browser.contextMenus.onClicked.addListener(menuHandler);
  browser.runtime.onConnect.addListener(connected);
}

function connected(p) {
  if (p.name === "pushlog-port") {
    port = p;
    port.onMessage.addListener(notify);
  }
}

function addMenu(currentUrl) {
  currentUrl = currentUrl.replace(anchorPat, "");
  let title = "";
  if (Object.keys(idUrl).length == 1) {
    title = "Pushlog";
  }
  for (let id in idUrl) {
    browser.contextMenus.create({
      id: id,
      title: title === "" ? id : title,
      contexts: ["selection"],
      icons: {
        "16": "icons/mercurial-16.png",
        "32": "icons/mercurial-32.png",
        "64": "icons/mercurial-64.png",
      },
      documentUrlPatterns: [currentUrl]
    });
  }
}

function notify(msg) {
  if (msg.hasOwnProperty("pushlog-data")) {
    idUrl = msg["pushlog-data"];
    browser.tabs.query({active: true,
                        windowId: browser.windows.WINDOW_ID_CURRENT})
           .then(tabs => browser.tabs.get(tabs[0].id))
           .then(tab => {
             addMenu(tab.url);
           });
  } else if (msg === "pushlog-clean") {
    clean();
  }
}

function clean() {
  for (let id in idUrl) {
    browser.contextMenus.remove(id);
  }
  idUrl = {};
}

init();
