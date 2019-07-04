/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let port = null;
const currentYear = (new Date()).getFullYear();
const buildidPattern = new RegExp("^[0-9]{14}$");
let currentBuildid = "";

function getBuildid() {
  const sel = window.getSelection();
  const str = sel.toString().trim();
  if (str.length > 14) {
    return "";
  }
  const range = sel.getRangeAt(0);
  const container = range.startContainer;
  if (container == range.endContainer) {
    const text = container.textContent;
    const pos = range.startOffset;
    if (pos + 14 < text.length) {
      const s = text.slice(pos, pos + 14);
      if (checkBuildid(s)) {
        return s;
      }
    }
  }
  if (str.length == 14 && checkBuildid(str)) {
    return str;
  }
  return "";
}

function selectionHandler() {
  const bid = getBuildid();
  if (bid.length != 0) {
    if (bid !== currentBuildid) {
      port.postMessage("pushlog-clean");
      currentBuildid = bid;
      getBuildInfo(bid).then(response => response.json())
                       .then(json => {
                         port.postMessage({"pushlog-data": extract(json, bid)});
                       })
                       .catch(e => {
                         console.log(e);
                       });
    }
  } else {
    currentBuildid = "";
    port.postMessage("pushlog-clean");
  }
}

function init() {
  document.addEventListener("selectionchange", selectionHandler);
  port = browser.runtime.connect({name: "pushlog-port"});
}

function getMajor(version) {
  return parseInt(version.split(".")[0], 10);
}

function checkBuildid(s) {
  if (s.match(buildidPattern)) {
    let n = parseInt(s, 10);
    [59, 59, 23, 31, 12].forEach(x => {
      if ((n % 100) > x) {
        return false;
      }
      n = Math.trunc(n / 100);
    });
    if (n < 1999 || n > currentYear) {
      return false;
    }
    return true;
  }
  return false;
}

function extract(data, baseBuildid) {
  const results = {};
  data.aggregations.products.buckets.forEach(i => {
    const product = i.key;
    i.channels.buckets.forEach(j => {
      const channel = j.key;
      const buckets = j.buildids.buckets;
      if (buckets.length == 2 && buckets[0].key === baseBuildid) {
        const lastRevision = buckets[0].revisions.buckets[0].key.slice(0, 12);
        const prevRevision = buckets[1].revisions.buckets[0].key.slice(0, 12);
        const id = product + "-" + channel;
        if (channel === "esr") {
          const major = getMajor(buckets[0].versions.buckets[0].key);
          results[id] = getPushlogUrl(lastRevision, prevRevision, "esr" + major);
        } else {
          results[id] = getPushlogUrl(lastRevision, prevRevision, channel);
        }
      }
    });
  });
  return results;
}

function getBaseUrl(channel) {
  if (channel === "beta" || channel === "aurora") {
    return "https://hg.mozilla.org/releases/mozilla-beta/pushloghtml?fromchange=";
  } else if (channel === "release") {
    return "https://hg.mozilla.org/releases/mozilla-release/pushloghtml?fromchange=";
  } else if (channel.startsWith("esr")) {
    return "https://hg.mozilla.org/releases/mozilla-" + channel + "/pushloghtml?fromchange=";
  }
  return "https://hg.mozilla.org/mozilla-central/pushloghtml?fromchange=";
}

function getPushlogUrl(last, prev, channel) {
  return getBaseUrl(channel) + prev + "&tochange=" + last;
}

async function getBuildInfo(buildid) {
  const url = "https://buildhub.moz.tools/api/search";
  const query = {
    "aggs": {
      "products": {
        "terms": {
          "field": "source.product",
          "size": 3
        },
        "aggs": {
          "channels": {
            "terms": {
              "field": "target.channel",
              "size": 5
            },
            "aggs": {
              "buildids": {
                "terms": {
                  "field": "build.id",
                  "size": 2,
                  "order": {
                    "_term": "desc"
                  }
                },
                "aggs": {
                  "revisions": {
                    "terms": {
                      "field": "source.revision",
                      "size": 1
                    }
                  },
                  "versions": {
                    "terms": {
                      "field": "target.version",
                      "size": 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "query": {
      "bool": {
        "filter": [
          {"terms": {"target.channel": ["release", "beta", "aurora", "nightly", "esr"]}},
          {"terms": {"source.product": ["devedition", "firefox", "fennec"]}},
          {"range": {"build.id": {"lte": buildid}}},
          {"regexp": {"target.version": "[0-9]+\.[0-9]+([ab\.][0-9]+)?(esr)?"}}
        ]
      }
    },
    "size": 0};
  const settings = {
    "method": "POST",
    "headers": {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    "body": JSON.stringify(query)
  };

  return await fetch(url, settings);
}

init();
