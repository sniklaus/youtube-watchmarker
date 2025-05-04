import { getStorageAsync, setStorageAsync } from '../utils.js';

let objDatabase = chrome.runtime.connect({ name: "database" });
let objHistory = chrome.runtime.connect({ name: "history" });
let objYoutube = chrome.runtime.connect({ name: "youtube" });
let objSearch = chrome.runtime.connect({ name: "search" });

jQuery(window.document).ready(async () => {
  jQuery("html").attr({
    "data-bs-theme":
      window.matchMedia("(prefers-color-scheme: dark)").matches === true
        ? "dark"
        : "",
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function (objEvent) {
      jQuery("html").attr({
        "data-bs-theme":
          window.matchMedia("(prefers-color-scheme: dark)").matches === true
            ? "dark"
            : "",
      });
    });

  jQuery("#idDatabase_Export").on("click", function () {
    jQuery("#idLoading_Container").css({
      display: "block",
    });

    jQuery("#idLoading_Message").text("exporting database");

    jQuery("#idLoading_Progress").text("...");

    jQuery("#idLoading_Close").addClass("disabled");

    objDatabase.postMessage({
      strMessage: "databaseExport",
      objRequest: {},
    });
  });

  objDatabase.onMessage.addListener(function (objData) {
    if (objData.strMessage === "databaseExport") {
      if (objData.objResponse === null) {
        jQuery("#idLoading_Message").text("error exporting database");
      } else if (objData.objResponse !== null) {
        jQuery("#idLoading_Message").text("finished exporting database");
      }

      jQuery("#idLoading_Close").removeClass("disabled");
    }

    if (objData.strMessage === "databaseExport-progress") {
      jQuery("#idLoading_Progress").text(objData.objResponse.strProgress);
    }
  });

  jQuery("#idDatabase_Import")
    .find("input")
    .on("change", function () {
      jQuery("#idLoading_Container").css({
        display: "block",
      });

      jQuery("#idLoading_Message").text("importing database");

      jQuery("#idLoading_Progress").text("...");

      jQuery("#idLoading_Close").addClass("disabled");

      let objFilereader = new FileReader();

      objFilereader.onload = function (objEvent) {
        objDatabase.postMessage({
          strMessage: "databaseImport",
          objRequest: {
            objVideos: JSON.parse(
              decodeURIComponent(escape(atob(objEvent.target.result))),
            ),
          },
        });
      };

      if (
        jQuery("#idDatabase_Import").find("input").get(0).files !== undefined
      ) {
        if (
          jQuery("#idDatabase_Import").find("input").get(0).files.length === 1
        ) {
          objFilereader.readAsText(
            jQuery("#idDatabase_Import").find("input").get(0).files[0],
            "utf-8",
          );
        }
      }
    });

  objDatabase.onMessage.addListener(function (objData) {
    if (objData.strMessage === "databaseImport") {
      if (objData.objResponse === null) {
        jQuery("#idLoading_Message").text("error importing database");
      } else if (objData.objResponse !== null) {
        jQuery("#idLoading_Message").text("finished importing database");
      }

      jQuery("#idLoading_Close").removeClass("disabled");
    }

    if (objData.strMessage === "databaseImport-progress") {
      jQuery("#idLoading_Progress").text(objData.objResponse.strProgress);
    }
  });

  jQuery("#idDatabase_Reset").on("click", function () {
    jQuery(this).css({
      display: "none",
    });

    jQuery("#idDatabase_Resyes").closest(".input-group").css({
      display: "inline",
    });
  });

  jQuery("#idDatabase_Resyes").on("click", function () {
    objDatabase.postMessage({
      strMessage: "databaseReset",
      objRequest: {},
    });
  });

  objDatabase.onMessage.addListener(function (objData) {
    if (objData.strMessage === "databaseReset") {
      window.location.reload();
    }
  });

  const intSize = await getStorageAsync("extensions.Youwatch.Database.intSize")
  jQuery("#idDatabase_Size").text(
    parseInt(intSize),
  );

  jQuery("#idHistory_Synchronize").on("click", function () {
    jQuery("#idLoading_Container").css({
      display: "block",
    });

    jQuery("#idLoading_Message").text("synchronizing history");

    jQuery("#idLoading_Progress").text("...");

    jQuery("#idLoading_Close").addClass("disabled");

    objHistory.postMessage({
      strMessage: "historySynchronize",
      objRequest: {
        intTimestamp: 0,
      },
    });
  });

  objHistory.onMessage.addListener(function (objData) {
    if (objData.strMessage === "historySynchronize") {
      if (objData.objResponse === null) {
        jQuery("#idLoading_Message").text("error synchronizing history");
      } else if (objData.objResponse !== null) {
        jQuery("#idLoading_Message").text("finished synchronizing history");
      }

      jQuery("#idLoading_Close").removeClass("disabled");
    }

    if (objData.strMessage === "historySynchronize-progress") {
      jQuery("#idLoading_Progress").text(objData.objResponse.strProgress);
    }
  });

  const intTimestampHistory = await getStorageAsync("extensions.Youwatch.History.intTimestamp");
  jQuery("#idHistory_Timestamp").text(
    moment(
      parseInt(intTimestampHistory),
    ).format("YYYY.MM.DD - HH:mm:ss"),
  );

  jQuery("#idYoutube_Synchronize").on("click", function () {
    jQuery("#idLoading_Container").css({
      display: "block",
    });

    jQuery("#idLoading_Message").text("synchronizing youtube");

    jQuery("#idLoading_Progress").text("...");

    jQuery("#idLoading_Close").addClass("disabled");

    objYoutube.postMessage({
      strMessage: "youtubeSynchronize",
      objRequest: {
        intThreshold: 1000000,
      },
    });
  });

  objYoutube.onMessage.addListener(function (objData) {
    if (objData.strMessage === "youtubeSynchronize") {
      if (objData.objResponse === null) {
        jQuery("#idLoading_Message").text("error synchronizing youtube");
      } else if (objData.objResponse !== null) {
        jQuery("#idLoading_Message").text("finished synchronizing youtube");
      }

      jQuery("#idLoading_Close").removeClass("disabled");
    }

    if (objData.strMessage === "youtubeSynchronize-progress") {
      jQuery("#idLoading_Progress").text(objData.objResponse.strProgress);
    }
  });

  const intTimestampYoutube = await getStorageAsync("extensions.Youwatch.Youtube.intTimestamp");
  jQuery("#idYoutube_Timestamp").text(
    moment(
      parseInt(intTimestampYoutube),
    ).format("YYYY.MM.DD - HH:mm:ss"),
  );

  // TODO: consider using css instead of manually setting the display
  // setup the display of checkboxes and click event handlers
  function updateCheckboxStates(boolState, $icons) {
    if (boolState === String(true)) {
      $icons.eq(0).hide().end().eq(1).show();
    } else {
      $icons.eq(0).show().end().eq(1).hide();
    }
  }
  const elements = [
    { id: "#idCondition_Brownav", key: "extensions.Youwatch.Condition.boolBrownav" },
    { id: "#idCondition_Browhist", key: "extensions.Youwatch.Condition.boolBrowhist" },
    { id: "#idCondition_Youprog", key: "extensions.Youwatch.Condition.boolYouprog" },
    { id: "#idCondition_Youbadge", key: "extensions.Youwatch.Condition.boolYoubadge" },
    { id: "#idCondition_Youhist", key: "extensions.Youwatch.Condition.boolYouhist" },
    { id: "#idVisualization_Fadeout", key: "extensions.Youwatch.Visualization.boolFadeout" },
    { id: "#idVisualization_Grayout", key: "extensions.Youwatch.Visualization.boolGrayout" },
    { id: "#idVisualization_Showbadge", key: "extensions.Youwatch.Visualization.boolShowbadge" },
    { id: "#idVisualization_Showdate", key: "extensions.Youwatch.Visualization.boolShowdate" },
    { id: "#idVisualization_Hideprogress", key: "extensions.Youwatch.Visualization.boolHideprogress" }
  ];
  elements.forEach(async (element) => {
    const $icons = jQuery(element.id).find("i");
    const boolState = await getStorageAsync(element.key);
    updateCheckboxStates(boolState, $icons);

    jQuery(element.id).on("click", async function () {
      const oldState = await getStorageAsync(element.key);
      const newState = String(oldState === String(false));
      await setStorageAsync(element.key, newState);
      updateCheckboxStates(newState, $icons);
    });
  });

  jQuery("#idSearch_Query").on("keydown", function (objEvent) {
    if (objEvent.keyCode === 13) {
      jQuery("#idSearch_Lookup").data({
        intSkip: 0,
      });

      jQuery("#idSearch_Lookup").triggerHandler("click");
    }
  });

  jQuery("#idSearch_Lookup")
    .data({
      intSkip: 0,
    })
    .on("click", function (objEvent) {
      if (objEvent.originalEvent !== undefined) {
        jQuery("#idSearch_Lookup").data({
          intSkip: 0,
        });
      }

      jQuery("#idSearch_Lookup")
        .addClass("disabled")
        .find("i")
        .eq(0)
        .css({
          display: "none",
        })
        .end()
        .eq(1)
        .css({
          display: "inline",
        })
        .end()
        .end();

      objSearch.postMessage({
        strMessage: "searchLookup",
        objRequest: {
          strQuery: jQuery("#idSearch_Query").val(),
          intSkip: jQuery("#idSearch_Lookup").data("intSkip"),
          intLength: 10,
        },
      });
    })
    .each(function () {
      jQuery(this).triggerHandler("click");
    });

  objSearch.onMessage.addListener(function (objData) {
    if (objData.strMessage === "searchLookup") {
      if (objData.objResponse === null) {
        return;
      }

      jQuery("#idSearch_Lookup")
        .removeClass("disabled")
        .find("i")
        .eq(0)
        .css({
          display: "inline",
        })
        .end()
        .eq(1)
        .css({
          display: "none",
        })
        .end()
        .end();

      if (jQuery("#idSearch_Lookup").data("intSkip") === 0) {
        jQuery("#idSearch_Results")
          .empty()
          .append(
            jQuery("<table></table>")
              .addClass("table")
              .addClass("table-sm")
              .css({
                margin: "0px",
              })
              .append(
                jQuery("<thead></thead>").append(
                  jQuery("<tr></tr>")
                    .append(
                      jQuery("<th></th>")
                        .attr({
                          width: "1%",
                        })
                        .text("Time"),
                    )
                    .append(jQuery("<th></th>").text("Title"))
                    .append(
                      jQuery("<th></th>")
                        .attr({
                          width: "1%",
                        })
                        .css({
                          "text-align": "right",
                        })
                        .text("Visits"),
                    )
                    .append(
                      jQuery("<th></th>").attr({
                        width: "1%",
                      }),
                    ),
                ),
              )
              .append(jQuery("<tbody></tbody>")),
          );
      }

      jQuery("#idSearch_Results")
        .find("tbody")
        .each(function () {
          for (let objVideo of objData.objResponse.objVideos) {
            jQuery(this).append(
              jQuery("<tr></tr>")
                .append(
                  jQuery("<td></td>").append(
                    jQuery("<div></div>")
                      .css({
                        "white-space": "nowrap",
                      })
                      .text(
                        moment(objVideo.intTimestamp).format(
                          "YYYY.MM.DD - HH:mm",
                        ),
                      ),
                  ),
                )
                .append(
                  jQuery("<td></td>")
                    .css({
                      position: "relative",
                    })
                    .append(
                      jQuery("<div></div>")
                        .css({
                          left: "8px",
                          overflow: "hidden",
                          position: "absolute",
                          right: "-8px",
                          "text-overflow": "ellipsis",
                          "white-space": "nowrap",
                        })
                        .append(
                          jQuery("<a></a>")
                            .attr({
                              href:
                                "https://www.youtube.com/watch?v=" +
                                objVideo.strIdent,
                            })
                            .css({
                              "text-decoration": "none",
                            })
                            .text(objVideo.strTitle),
                        ),
                    ),
                )
                .append(
                  jQuery("<td></td>").append(
                    jQuery("<div></div>")
                      .css({
                        "white-space": "nowrap",
                        "text-align": "right",
                      })
                      .text(objVideo.intCount),
                  ),
                )
                .append(
                  jQuery("<td></td>").append(
                    jQuery("<div></div>")
                      .css({
                        "white-space": "nowrap",
                      })
                      .append(
                        jQuery("<a></a>")
                          .addClass("fa-regular")
                          .addClass("fa-trash-can")
                          .css({
                            cursor: "pointer",
                          })
                          .data({
                            strIdent: objVideo.strIdent,
                          })
                          .on("click", function () {
                            jQuery("#idLoading_Container").css({
                              display: "block",
                            });

                            jQuery("#idLoading_Message").text("deleting video");

                            jQuery("#idLoading_Progress").text("...");

                            jQuery("#idLoading_Close").addClass("disabled");

                            objSearch.postMessage({
                              strMessage: "searchDelete",
                              objRequest: {
                                strIdent: jQuery(this).data("strIdent"),
                              },
                            });
                          }),
                      ),
                  ),
                ),
            );
          }
        });

      if (objData.objResponse.objVideos.length === 10) {
        jQuery("#idSearch_Results")
          .find("tr:last")
          .each(function () {
            new IntersectionObserver(function (objEntries, objObserver) {
              if (objEntries[0].isIntersecting === true) {
                objObserver.unobserve(objEntries[0].target);

                jQuery("#idSearch_Lookup").data({
                  intSkip: jQuery("#idSearch_Lookup").data("intSkip") + 10,
                });

                jQuery("#idSearch_Lookup").triggerHandler("click");
              }
            }).observe(this);
          });
      }
    }

    if (objData.strMessage === "searchDelete") {
      if (objData.objResponse === null) {
        jQuery("#idLoading_Message").text("error deleting video");
      } else if (objData.objResponse !== null) {
        jQuery("#idLoading_Message").text("finished deleting video");
      }

      jQuery("#idLoading_Close").removeClass("disabled");
    }

    if (objData.strMessage === "searchDelete-progress") {
      jQuery("#idLoading_Progress").text(objData.objResponse.strProgress);
    }
  });

  jQuery("#idLoading_Close").on("click", function () {
    window.location.reload();
  });
});
