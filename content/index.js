'use strict';

let objDatabase = chrome.runtime.connect({
    'name': 'database'
});

let objHistory = chrome.runtime.connect({
    'name': 'history'
});

let objYoutube = chrome.runtime.connect({
    'name': 'youtube'
});

let objSearch = chrome.runtime.connect({
    'name': 'search'
});

let funcStorageget = async function(strKey) {
    let objValue = await chrome.storage.local.get(strKey);

    if (objValue[strKey] === undefined) {
        return null;
    }

    return String(objValue[strKey]);
};

let funcStorageset = async function(strKey, objValue) {
     await chrome.storage.local.set({ [strKey]: String(objValue) });
};

jQuery(window.document).ready(async function() {
    jQuery('html')
        .attr({
            'data-bs-theme': window.matchMedia('(prefers-color-scheme: dark)').matches === true ? 'dark' : ''
        })
    ;

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(objEvent) {
        jQuery('html')
            .attr({
                'data-bs-theme': window.matchMedia('(prefers-color-scheme: dark)').matches === true ? 'dark' : ''
            })
        ;
    });

    jQuery('#idDatabase_Export')
        .on('click', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('exporting database')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            objDatabase.postMessage({
                'strMessage': 'databaseExport',
                'objRequest': {}
            });
        })
        .each(function() {
            objDatabase.onMessage.addListener(function(objData) {
                if (objData.strMessage === 'databaseExport') {
                    if (objData.objResponse === null) {
                        jQuery('#idLoading_Message')
                            .text('error exporting database')
                        ;

                    } else if (objData.objResponse !== null) {
                        jQuery('#idLoading_Message')
                            .text('finished exporting database')
                        ;

                        download(btoa(unescape(encodeURIComponent(JSON.stringify(objData.objResponse.objVideos)))), new Date().getFullYear() + '.' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '.' + ('0' + new Date().getDate()).slice(-2) + '.database', 'application/octet-stream');
                    }

                    jQuery('#idLoading_Close')
                        .removeClass('disabled')
                    ;

                } else if (objData.strMessage === 'databaseExport-progress') {
                    jQuery('#idLoading_Progress')
                        .text(objData.objResponse.strProgress)
                    ;

                }
            });
        })
    ;

    jQuery('#idDatabase_Import').find('input')
        .on('change', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('importing database')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            let objFilereader = new FileReader();

            objFilereader.onload = function(objEvent) {
                objDatabase.postMessage({
                    'strMessage': 'databaseImport',
                    'objRequest': {
                        'objVideos': JSON.parse(decodeURIComponent(escape(atob(objEvent.target.result))))
                    }
                });
            };

            if (jQuery('#idDatabase_Import').find('input').get(0).files !== undefined) {
                if (jQuery('#idDatabase_Import').find('input').get(0).files.length === 1) {
                    objFilereader.readAsText(jQuery('#idDatabase_Import').find('input').get(0).files[0], 'utf-8');
                }
            }
        })
        .each(function() {
            objDatabase.onMessage.addListener(function(objData) {
                if (objData.strMessage === 'databaseImport') {
                    if (objData.objResponse === null) {
                        jQuery('#idLoading_Message')
                            .text('error importing database')
                        ;

                    } else if (objData.objResponse !== null) {
                        jQuery('#idLoading_Message')
                            .text('finished importing database')
                        ;

                    }

                    jQuery('#idLoading_Close')
                        .removeClass('disabled')
                    ;

                } else if (objData.strMessage === 'databaseImport-progress') {
                    jQuery('#idLoading_Progress')
                        .text(objData.objResponse.strProgress)
                    ;

                }
            });
        })
    ;

    jQuery('#idDatabase_Reset')
        .on('click', function() {
            jQuery(this)
                .css({
                    'display': 'none'
                })
            ;

            jQuery('#idDatabase_Resyes').closest('.input-group')
                .css({
                    'display': 'inline'
                })
            ;
        })
    ;

    jQuery('#idDatabase_Resyes')
        .on('click', function() {
            objDatabase.postMessage({
                'strMessage': 'databaseReset',
                'objRequest': {}
            });
        })
        .each(function() {
            objDatabase.onMessage.addListener(function(objData) {
                if (objData.strMessage === 'databaseReset') {
                    window.location.reload();
                }
            });
        })
    ;

    jQuery('#idDatabase_Size')
        .text(parseInt(await funcStorageget('extensions.Youwatch.Database.intSize')))
    ;

    jQuery('#idHistory_Synchronize')
        .on('click', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('synchronizing history')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            objHistory.postMessage({
                'strMessage': 'historySynchronize',
                'objRequest': {
                    'intTimestamp': 0
                }
            });
        })
        .each(function() {
            objHistory.onMessage.addListener(function(objData) {
                if (objData.strMessage === 'historySynchronize') {
                    if (objData.objResponse === null) {
                        jQuery('#idLoading_Message')
                            .text('error synchronizing history')
                        ;

                    } else if (objData.objResponse !== null) {
                        jQuery('#idLoading_Message')
                            .text('finished synchronizing history')
                        ;

                    }

                    jQuery('#idLoading_Close')
                        .removeClass('disabled')
                    ;

                } else if (objData.strMessage === 'historySynchronize-progress') {
                    jQuery('#idLoading_Progress')
                        .text(objData.objResponse.strProgress)
                    ;

                }
            });
        })
    ;

    jQuery('#idHistory_Timestamp')
        .text(moment(parseInt(await funcStorageget('extensions.Youwatch.History.intTimestamp'))).format('YYYY.MM.DD - HH:mm:ss'))
    ;

    jQuery('#idYoutube_Synchronize')
        .on('click', function() {
            jQuery('#idLoading_Container')
                .css({
                    'display': 'block'
                })
            ;

            jQuery('#idLoading_Message')
                .text('synchronizing youtube')
            ;

            jQuery('#idLoading_Progress')
                .text('...')
            ;

            jQuery('#idLoading_Close')
                .addClass('disabled')
            ;

            objYoutube.postMessage({
                'strMessage': 'youtubeSynchronize',
                'objRequest': {
                    'intThreshold': 1000000
                }
            });
        })
        .each(function() {
            objYoutube.onMessage.addListener(function(objData) {
                if (objData.strMessage === 'youtubeSynchronize') {
                    if (objData.objResponse === null) {
                        jQuery('#idLoading_Message')
                            .text('error synchronizing youtube')
                        ;

                    } else if (objData.objResponse !== null) {
                        jQuery('#idLoading_Message')
                            .text('finished synchronizing youtube')
                        ;

                    }

                    jQuery('#idLoading_Close')
                        .removeClass('disabled')
                    ;

                } else if (objData.strMessage === 'youtubeSynchronize-progress') {
                    jQuery('#idLoading_Progress')
                        .text(objData.objResponse.strProgress)
                    ;

                }
            });
        })
    ;

    jQuery('#idYoutube_Timestamp')
        .text(moment(parseInt(await funcStorageget('extensions.Youwatch.Youtube.intTimestamp'))).format('YYYY.MM.DD - HH:mm:ss'))
    ;

    jQuery('#idCondition_Brownav')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Condition.boolBrownav', await funcStorageget('extensions.Youwatch.Condition.boolBrownav') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Browhist')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Condition.boolBrowhist', await funcStorageget('extensions.Youwatch.Condition.boolBrowhist') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youbadge')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Condition.boolYoubadge', await funcStorageget('extensions.Youwatch.Condition.boolYoubadge') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youhist')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Condition.boolYouhist', await funcStorageget('extensions.Youwatch.Condition.boolYouhist') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Fadeout')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Visualization.boolFadeout', await funcStorageget('extensions.Youwatch.Visualization.boolFadeout') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Grayout')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Visualization.boolGrayout', await funcStorageget('extensions.Youwatch.Visualization.boolGrayout') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Showbadge')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Visualization.boolShowbadge', await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Showdate')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Visualization.boolShowdate', await funcStorageget('extensions.Youwatch.Visualization.boolShowdate') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Hideprogress')
        .on('click', async function() {
            await funcStorageset('extensions.Youwatch.Visualization.boolHideprogress', await funcStorageget('extensions.Youwatch.Visualization.boolHideprogress') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': await funcStorageget('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': await funcStorageget('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idSearch_Query')
        .on('keydown', function(objEvent) {
            if (objEvent.keyCode === 13) {
                jQuery('#idSearch_Lookup')
                    .data({
                        'intSkip' : 0
                    })
                ;

                jQuery('#idSearch_Lookup').triggerHandler('click');
            }
        })
    ;

    jQuery('#idSearch_Lookup')
        .data({
            'intSkip' : 0
        })
        .on('click', function(objEvent) {
            if (objEvent.originalEvent !== undefined) {
                jQuery('#idSearch_Lookup')
                    .data({
                        'intSkip' : 0
                    })
                ;
            }

            jQuery('#idSearch_Lookup')
                .addClass('disabled')
                .find('i')
                    .eq(0)
                        .css({
                            'display': 'none'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': 'inline'
                        })
                    .end()
                .end()
            ;

            objSearch.postMessage({
                'strMessage': 'searchLookup',
                'objRequest': {
                    'strQuery': jQuery('#idSearch_Query').val(),
                    'intSkip': jQuery('#idSearch_Lookup').data('intSkip'),
                    'intLength': 10
                }
            });
        })
        .each(function() {
            objSearch.onMessage.addListener(function(objData) {
                if (objData.strMessage === 'searchLookup') {
                    if (objData.objResponse === null) {
                        return;
                    }

                    jQuery('#idSearch_Lookup')
                        .removeClass('disabled')
                        .find('i')
                            .eq(0)
                                .css({
                                    'display': 'inline'
                                })
                            .end()
                            .eq(1)
                                .css({
                                    'display': 'none'
                                })
                            .end()
                        .end()
                    ;

                    if (jQuery('#idSearch_Lookup').data('intSkip') === 0) {
                        jQuery('#idSearch_Results')
                            .empty()
                            .css({
                                'display': 'flex',
                                'flex-direction': 'column',
                                'gap': '16px'
                            })
                        ;
                    }

                    for (let objVideo of objData.objResponse.objVideos) {
                        jQuery('#idSearch_Results')
                            .append(jQuery('<div></div>')
                                .css({
                                    'border': '1px solid var(--bs-border-color)',
                                    'border-radius': 'var(--bs-border-radius)',
                                    'display': 'flex',
                                    'gap': '12px',
                                    'padding': '12px'
                                })
                                .append(jQuery('<div></div>')
                                    .append(jQuery('<a></a>')
                                        .attr({
                                            'href': 'https://www.youtube.com/watch?v=' + objVideo.strIdent,
                                            'target': '_blank'
                                        })
                                        .append(jQuery('<img></img>')
                                            .attr({
                                                'src': 'https://img.youtube.com/vi/' + objVideo.strIdent + '/mqdefault.jpg'
                                            })
                                            .css({
                                                'border-radius': 'var(--bs-border-radius)',
                                                'height': '94px',
                                                'width': '168px'
                                            })
                                        )
                                    )
                                )
                                .append(jQuery('<div></div>')
                                    .css({
                                        'flex': '1'
                                    })
                                    .append(jQuery('<div></div>')
                                        .append(jQuery('<a></a>')
                                            .attr({
                                                'href': 'https://www.youtube.com/watch?v=' + objVideo.strIdent,
                                                'target': '_blank'
                                            })
                                            .css({
                                                'color': 'inherit',
                                                'font-size': '16px',
                                                'text-decoration': 'none'
                                            })
                                            .text(objVideo.strTitle)
                                        )
                                    )
                                    .append(jQuery('<div></div>')
                                        .css({
                                            'color': 'var(--bs-secondary-color)',
                                            'font-size': '13px',
                                            'margin': '5px 0px 0px 0px'
                                        })
                                        .text(moment(objVideo.intTimestamp).format('YYYY.MM.DD - HH:mm'))
                                    )
                                    .append(jQuery('<div></div>')
                                        .css({
                                            'color': 'var(--bs-secondary-color)',
                                            'font-size': '13px',
                                            'margin': '5px 0px 0px 0px'
                                        })
                                        .text(objVideo.intCount + ' View' + (objVideo.intCount == 1 ? '' : 's'))
                                    )
                                )
                                .append(jQuery('<div></div>')
                                    .append(jQuery('<div></div>')
                                        .css({
                                            'cursor': 'pointer'
                                        })
                                        .append(jQuery('<i></i>')
                                            .addClass('fa-regular')
                                            .addClass('fa-trash-can')
                                        )
                                        .data({
                                            'strIdent': objVideo.strIdent
                                        })
                                        .on('click', function() {
                                            jQuery('#idLoading_Container')
                                                .css({
                                                    'display': 'block'
                                                })
                                            ;

                                            jQuery('#idLoading_Message')
                                                .text('deleting video')
                                            ;

                                            jQuery('#idLoading_Progress')
                                                .text('...')
                                            ;

                                            jQuery('#idLoading_Close')
                                                .addClass('disabled')
                                            ;

                                            objSearch.postMessage({
                                                'strMessage': 'searchDelete',
                                                'objRequest': {
                                                    'strIdent': jQuery(this).data('strIdent')
                                                }
                                            });
                                        })
                                    )
                                )
                            )
                        ;
                    }

                    if (objData.objResponse.objVideos.length === 10) {
                        jQuery('#idSearch_Results').children().eq(-1)
                            .each(function() {
                                new IntersectionObserver(function(objEntries, objObserver) {
                                    if (objEntries[0].isIntersecting === true) {
                                        objObserver.unobserve(objEntries[0].target);

                                        jQuery('#idSearch_Lookup')
                                            .data({
                                                'intSkip' : jQuery('#idSearch_Lookup').data('intSkip') + 10
                                            })
                                        ;

                                        jQuery('#idSearch_Lookup').triggerHandler('click');
                                    }
                                }).observe(this)
                            })
                        ;
                    }

                } else if (objData.strMessage === 'searchDelete') {
                    if (objData.objResponse === null) {
                        jQuery('#idLoading_Message')
                            .text('error deleting video')
                        ;

                    } else if (objData.objResponse !== null) {
                        jQuery('#idLoading_Message')
                            .text('finished deleting video')
                        ;

                    }

                    jQuery('#idLoading_Close')
                        .removeClass('disabled')
                    ;

                } else if (objData.strMessage === 'searchDelete-progress') {
                    jQuery('#idLoading_Progress')
                        .text(objData.objResponse.strProgress)
                    ;

                }
            });
        })
        .each(function() {
            jQuery(this).triggerHandler('click');
        })
    ;

    jQuery('#idLoading_Close')
        .on('click', function() {
            window.location.reload();
        })
    ;
});
