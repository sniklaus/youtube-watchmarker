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

jQuery(window.document).ready(function() {
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

    jQuery('[data-bs-toggle="tab"]').on('click', function(e) {
        e.preventDefault();
        
        jQuery('.nav-link').removeClass('active');
        jQuery('.tab-pane').removeClass('show active');
        
        jQuery(this).addClass('active');
        jQuery(jQuery(this).attr('data-bs-target')).addClass('show active');
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
    ;

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

            }

            jQuery('#idLoading_Close')
                .removeClass('disabled')
            ;
        }

        if (objData.strMessage === 'databaseExport-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

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
    ;

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
        }

        if (objData.strMessage === 'databaseImport-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

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
    ;

    objDatabase.onMessage.addListener(function(objData) {
        if (objData.strMessage === 'databaseReset') {
            window.location.reload();
        }
    });

    jQuery('#idDatabase_Size')
        .text(parseInt(window.localStorage.getItem('extensions.Youwatch.Database.intSize')))
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
    ;

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
        }

        if (objData.strMessage === 'historySynchronize-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idHistory_Timestamp')
        .text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.History.intTimestamp'))).format('YYYY.MM.DD - HH:mm:ss'))
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
    ;

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
        }

        if (objData.strMessage === 'youtubeSynchronize-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idYoutube_Timestamp')
        .text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.Youtube.intTimestamp'))).format('YYYY.MM.DD - HH:mm:ss'))
    ;

    jQuery('#idCondition_Brownav')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolBrownav', window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Browhist')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolBrowhist', window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youprog')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYouprog', window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouprog') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youbadge')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYoubadge', window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idCondition_Youhist')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYouhist', window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Fadeout')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolFadeout', window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Grayout')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolGrayout', window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Showbadge')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolShowbadge', window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Showdate')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolShowdate', window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true) ? 'block' : 'none'
                })
            .end()
        .end()
    ;

    jQuery('#idVisualization_Hideprogress')
        .on('click', function() {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolHideprogress', window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(false));

            jQuery(this)
                .find('i')
                    .eq(0)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
                        })
                    .end()
                    .eq(1)
                        .css({
                            'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
                        })
                    .end()
                .end()
            ;
        })
        .find('i')
            .eq(0)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
                })
            .end()
            .eq(1)
                .css({
                    'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
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
            jQuery(this).triggerHandler('click');
        })
    ;

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
                            'display': 'flex',
                            'background': 'var(--bs-body-bg)',
                            'border': '1px solid var(--bs-border-color)',
                            'border-radius': '8px',
                            'padding': '12px',
                            'gap': '12px',
                            'align-items': 'flex-start'
                        })
                        .append(jQuery('<div></div>')
                            .css({
                                'flex-shrink': '0',
                                'width': '168px',
                                'height': '94px',
                                'background': '#f0f0f0',
                                'border-radius': '8px',
                                'position': 'relative',
                                'overflow': 'hidden'
                            })
                            .append(jQuery('<img>')
                                .attr({
                                    'src': 'https://img.youtube.com/vi/' + objVideo.strIdent + '/mqdefault.jpg',
                                    'alt': 'Video thumbnail'
                                })
                                .css({
                                    'width': '100%',
                                    'height': '100%',
                                    'object-fit': 'cover'
                                })
                            )
                            .append(jQuery('<a></a>')
                                .attr({
                                    'href': 'https://www.youtube.com/watch?v=' + objVideo.strIdent,
                                    'target': '_blank'
                                })
                                .css({
                                    'position': 'absolute',
                                    'top': '0',
                                    'left': '0',
                                    'width': '100%',
                                    'height': '100%',
                                    'text-decoration': 'none'
                                })
                            )
                        )
                        .append(jQuery('<div></div>')
                            .css({
                                'flex': '1',
                                'min-width': '0'
                            })
                            .append(jQuery('<div></div>')
                                .css({
                                    'font-weight': '500',
                                    'font-size': '16px',
                                    'line-height': '1.3',
                                    'margin-bottom': '4px',
                                    'color': 'var(--bs-body-color)'
                                })
                                .append(jQuery('<a></a>')
                                    .attr({
                                        'href': 'https://www.youtube.com/watch?v=' + objVideo.strIdent,
                                        'target': '_blank'
                                    })
                                    .css({
                                        'text-decoration': 'none',
                                        'color': 'inherit'
                                    })
                                    .text(objVideo.strTitle)
                                )
                            )
                            .append(jQuery('<div></div>')
                                .css({
                                    'font-size': '13px',
                                    'color': 'var(--bs-secondary-color)',
                                    'margin-bottom': '4px'
                                })
                                .text(moment(objVideo.intTimestamp).format('MMM D, YYYY, HH:mm:ss'))
                            )
                            .append(jQuery('<div></div>')
                                .css({
                                    'font-size': '13px',
                                    'color': 'var(--bs-secondary-color)',
                                    'display': 'flex',
                                    'gap': '12px'
                                })
                                .append(jQuery('<span></span>')
                                    .text(`${objVideo.intCount} View${objVideo.intCount==1?'':'s'}`)
                                )
                            )
                        )
                        .append(jQuery('<div></div>')
                            .css({
                                'flex-shrink': '0',
                                'padding': '4px'
                            })
                            .append(jQuery('<button></button>')
                                .addClass('btn btn-sm btn-outline-danger')
                                .css({
                                    'border': 'none',
                                    'background': 'transparent',
                                    'color': 'var(--bs-secondary-color)',
                                    'padding': '4px 8px'
                                })
                                .append(jQuery('<i></i>')
                                    .addClass('fa-regular fa-trash-can')
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
                jQuery('#idSearch_Results').children().last()
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
        }

        if (objData.strMessage === 'searchDelete') {
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
        }

        if (objData.strMessage === 'searchDelete-progress') {
            jQuery('#idLoading_Progress')
                .text(objData.objResponse.strProgress)
            ;
        }
    });

    jQuery('#idLoading_Close')
        .on('click', function() {
            window.location.reload();
        })
    ;
});
