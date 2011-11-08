
// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  if(this.console) {
    arguments.callee = arguments.callee.caller;
    var newarr = [].slice.call(arguments);
    (typeof console.log === 'object' ? log.apply.call(console.log, console, newarr) : console.log.apply(console, newarr));
  }
};

// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,clear,count,debug,dir,dirxml,error,exception,firebug,group,groupCollapsed,groupEnd,info,log,memoryProfile,memoryProfileEnd,profile,profileEnd,table,time,timeEnd,timeStamp,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());


// place any jQuery/helper plugins in here, instead of separate, slower script files.

/*
 * Bigtext.js
 */

;(function(window, $)
{
    var counter = 0,
        $headCache = $('head'),
        BigText = {
            STARTING_PX_FONT_SIZE: 32,
            DEFAULT_MAX_FONT_SIZE_PX: 528,
            GLOBAL_STYLE_ID: 'bigtext-style',
            STYLE_ID: 'bigtext-id',
            LINE_CLASS_PREFIX: 'bigtext-line',
            EXEMPT_CLASS: 'bigtext-exempt',
            DEFAULT_CHILD_SELECTOR: '> div',
            childSelectors: {
                div: '> div',
                ol: '> li',
                ul: '> li'
            },
            init: function()
            {
                if(!$('#'+BigText.GLOBAL_STYLE_ID).length) {
                    $headCache.append(BigText.generateStyleTag(BigText.GLOBAL_STYLE_ID, ['.bigtext * { white-space: nowrap; }',
                                                                                    '.bigtext .' + BigText.EXEMPT_CLASS + ', .bigtext .' + BigText.EXEMPT_CLASS + ' * { white-space: normal; }']));
                }
            },
            bindResize: function(eventName, resizeFunction)
            {
                if($.throttle) {
                    // https://github.com/cowboy/jquery-throttle-debounce
                    $(window).unbind(eventName).bind(eventName, $.throttle(100, resizeFunction));
                } else {
                    if($.fn.smartresize) {
                        // https://github.com/lrbabe/jquery-smartresize/
                        eventName = 'smartresize.' + eventNamespace;
                    }
                    $(window).unbind(eventName).bind(eventName, resizeFunction);
                }
            },
            getStyleId: function(id)
            {
                return BigText.STYLE_ID + '-' + id;
            },
            generateStyleTag: function(id, css)
            {
                return $('<style>' + css.join('\n') + '</style>').attr('id', id);
            },
            clearCss: function(id)
            {
                var styleId = BigText.getStyleId(id);
                $('#' + styleId).remove();
            },
            generateCss: function(id, linesFontSizes, lineWordSpacings)
            {
                var css = [];

                BigText.clearCss(id);

                for(var j=0, k=linesFontSizes.length; j<k; j++) {
                    css.push('#' + id + ' .' + BigText.LINE_CLASS_PREFIX + j + ' {' + 
                        (linesFontSizes[j] ? ' font-size: ' + linesFontSizes[j] + 'px;' : '') + 
                        (lineWordSpacings[j] ? ' word-spacing: ' + lineWordSpacings[j] + 'px;' : '') +
                        '}');
                }

                return BigText.generateStyleTag(BigText.getStyleId(id), css);
            }
        };

    function testLineDimensions($line, maxWidth, property, size, interval, units)
    {
        var width;
        $line.css(property, size + units);

        width = $line.width();

        if(width >= maxWidth) {
            $line.css(property, '');

            if(width == maxWidth) {
                return {
                    match: 'exact',
                    size: parseFloat((parseFloat(size) - .1).toFixed(3))
                };
            }

            return {
                match: 'estimate',
                size: parseFloat((parseFloat(size) - interval).toFixed(3))
            };
        }

        return false;
    }

    function calculateSizes($t, childSelector, maxWidth, maxFontSize)
    {
        var $c = $t.clone(true)
                    .addClass('bigtext-cloned')
                    .css({
                        'min-width': parseInt(maxWidth, 10),
                        width: 'auto',
                        position: 'absolute',
                        left: -9999,
                        top: -9999
                    }).appendTo(document.body);

        // font-size isn't the only thing we can modify, we can also mess with:
        // word-spacing and letter-spacing.
        // Note: webkit does not respect subpixel letter-spacing or word-spacing,
        // nor does it respect hundredths of a font-size em.
        var fontSizes = [],
            wordSpacings = [],
            ratios = [];

        $c.find(childSelector).css({
            float: 'left',
            clear: 'left'
        }).each(function(lineNumber) {
            var $line = $(this),
                intervals = [4,1,.4,.1],
                lineMax;

            if($line.hasClass(BigText.EXEMPT_CLASS)) {
                fontSizes.push(null);
                ratios.push(null);
                return;
            }

            // TODO we can cache this ratio?
            var autoGuessSubtraction = 20, // px
                currentFontSize = parseFloat($line.css('font-size')),
                lineWidth = $line.width(),
                ratio = (lineWidth / currentFontSize).toFixed(6),
                newFontSize = parseFloat(((maxWidth - autoGuessSubtraction) / ratio).toFixed(3));

            outer: for(var m=0, n=intervals.length; m<n; m++) {
                inner: for(var j=1, k=4; j<=k; j++) {
                    if(newFontSize + j*intervals[m] > maxFontSize) {
                        newFontSize = maxFontSize;
                        break outer;
                    }

                    lineMax = testLineDimensions($line, maxWidth, 'font-size', newFontSize + j*intervals[m], intervals[m], 'px');
                    if(lineMax !== false) {
                        newFontSize = lineMax.size;

                        if(lineMax.match == 'exact') {
                            break outer;
                        }
                        break inner;
                    }
                }
            }

            ratios.push(maxWidth / newFontSize);

            if(newFontSize > maxFontSize) {
                fontSizes.push(maxFontSize);
            } else {
                fontSizes.push(newFontSize);
            }
        }).each(function(lineNumber) {
            var $line = $(this),
                wordSpacing = 0,
                interval = 1,
                maxWordSpacing;

            if($line.hasClass(BigText.EXEMPT_CLASS)) {
                wordSpacings.push(null);
                return;
            }

            // must re-use font-size, even though it was removed above.
            $line.css('font-size', fontSizes[lineNumber] + 'px');

            for(var m=1, n=5; m<n; m+=interval) {
                maxWordSpacing = testLineDimensions($line, maxWidth, 'word-spacing', m, interval, 'px');
                if(maxWordSpacing !== false) {
                    wordSpacing = maxWordSpacing.size;
                    break;
                }
            }

            $line.css('font-size', '');
            wordSpacings.push(wordSpacing);
        }).removeAttr('style');

        $c.remove();

        return {
            fontSizes: fontSizes,
            wordSpacings: wordSpacings,
            ratios: ratios
        };
    }

    $.fn.bigtext = function(options)
    {
        BigText.init();

        options = $.extend({
                    maxfontsize: BigText.DEFAULT_MAX_FONT_SIZE_PX,
                    childSelector: '',
                    resize: true
                }, options || {});
    
        return this.each(function()
        {
            var $t = $(this).addClass('bigtext'),
                childSelector = options.childSelector ||
                            BigText.childSelectors[this.tagName.toLowerCase()] ||
                            BigText.DEFAULT_CHILD_SELECTOR,
                maxWidth = $t.width(),
                id = $t.attr('id');

            if(!id) {
                id = 'bigtext-id' + (counter++);
                $t.attr('id', id);
            }

            if(options.resize) {
                BigText.bindResize('resize.bigtext-event-' + id, function()
                {
                    $('#' + id).bigtext(options);
                });
            }

            BigText.clearCss(id);

            $t.find(childSelector).addClass(function(lineNumber, className)
            {
                // remove existing line classes.
                return [className.replace(new RegExp('\\s*' + BigText.LINE_CLASS_PREFIX + '\\d+'), ''),
                        BigText.LINE_CLASS_PREFIX + lineNumber].join(' ');
            });

            var sizes = calculateSizes($t, childSelector, maxWidth, options.maxfontsize);
            $headCache.append(BigText.generateCss(id, sizes.fontSizes, sizes.wordSpacings));
        });
    };

    window.BigText = BigText;
})(this, jQuery);

/*
 * Smiley slider
 */
function SmileySlider(container, imgSrc) {
    if (!imgSrc)
        imgSrc = "smiley-slider.png"

    var width = 329
    var height = 37
    
    var headWidth = 40
    var maxHeadX = width - headWidth + 1
    
    var base = document.createElement('div')
    base.style.width = width + "px"
    base.style.height = height + "px"
    base.style.background = "white"
    
    var track = document.createElement('div')
    track.style.width = width + "px"
    track.style.height = 6 + "px"
    track.style.marginRight = '-' + track.style.width
    track.style.marginBottom = '-' + track.style.height
    track.style.position = "relative"
    track.style.top = 15 + "px"
    track.style.background = "url('" + imgSrc + "')"
    base.appendChild(track)
    
    var head = document.createElement('div')
    head.style.width = headWidth + "px"
    head.style.height = height + "px"
    head.style.marginRight = '-' + head.style.width
    head.style.marginBottom = '-' + head.style.height
    head.style.position = "relative"
    head.style.background = "url('" + imgSrc + "') scroll 0px -6px"
    base.appendChild(head)

    var face = document.createElement('canvas')
    face.style.width = 36 + "px"
    face.style.height = 37 + "px"
    face.style.position = "relative"
    face.style.left = 4 + "px"
    face.width = "36"
    face.height = "37"
    head.appendChild(face)
    
    var glass = document.createElement('div')
    glass.style.width = width + "px"
    glass.style.height = height + "px"
    glass.style.marginRight = '-' + glass.style.width
    glass.style.marginBottom = '-' + glass.style.height
    glass.style.position = "relative"
    base.appendChild(glass)
    
    container.appendChild(base)

    //////////////////////////////////////////////////////////////
    // head position
    
    var onHeadMove = null
    var onHeadFinish = null
    
    function positionInt(e) {
        if (e === undefined) {
            return getPos(head).x - getPos(base).x
        } else {
            head.style.left = Math.round(cap(e, 0, maxHeadX)) + "px"
            var p = position()
            drawFace(face, 100, p, 0.8)
            if (onHeadMove) onHeadMove(p)
            return p
        }
    }
    
    function position(e, e2) {
        if (e === undefined) {
            return lerp(0, 0, maxHeadX, 1, positionInt())
        } else if (typeof(e) == "function") {
            onHeadMove = e
        } else {
            positionInt(lerp(0, 0, 1, maxHeadX, e))
        }

        if (typeof(e2) == "function") {
            onHeadFinish = e2
        } 
    }
    
    this.position = position    
    setTimeout(function () {
        position(0.5)
    }, 0)

    //////////////////////////////////////////////////////////////
    // mouse

    glass.onmousedown = function (e) {
        e.preventDefault()
        var pos = getRelPos(glass, e)
        
        var grabX = headWidth / 2
        var headX = positionInt()
        if (pos.x >= headX && pos.x < headX + headWidth) {
            grabX = pos.x - headX
        }
        
        var p = positionInt(pos.x - grabX)

        var oldMove = document.onmousemove
        document.onmousemove = function (e) {
            var pos = getRelPos(glass, e)
            
            positionInt(pos.x - grabX)
        }
        
        var oldUp = document.onmouseup
        document.onmouseup = function (e) {
            if (onHeadFinish) onHeadFinish(position())
            document.onmousemove = oldMove
            document.onmouseup = oldUp
        }
    }

    //////////////////////////////////////////////////////////////
    // core drawing code
    
    const PI180 = Math.PI / 180;
    
    function drawFace(canvas, radius, emotion, innerScale) {
        emotion = Math.max(0, Math.min(1, emotion));
        var diam = radius * 2;
        
        var ctx = canvas.getContext('2d');
        ctx.clearRect (0, 0, diam, diam);

        ctx.beginPath();
        ctx.fillStyle = '#414084'; 
        drawSmile(ctx, 15.5, 20, innerScale, emotion);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#414084';
        drawEyeBrows(ctx, 9.5, 16, 23, 16, 7, 5, emotion);
        ctx.stroke();
    };

    function drawSmile(context, mainRadius, offsetY, innerScale, emotion) {
        var eased = 1 - easeInQuad(emotion, 0, 1, 1);
        var innerScale = innerScale - (eased * 0.4);
        var curveOffset = easeInCubic(emotion, 0.1, 0.6, 1);
        drawArc(context, mainRadius, offsetY, innerScale, emotion);
        drawArc(context, mainRadius, offsetY, innerScale, emotion, curveOffset, true);
    }

    function easeInCubic(t, b, c, d) {
        return c*(t/=d)*t*t + b;
    }

    function easeInQuad(t, b, c, d) {
        return c*(t/=d)*t + b;
    }

    function drawArc(context, mainRadius, offsetY, innerScale, emotion, curveOffset, reverseX) {
        curveOffset = (curveOffset === undefined) ? 0 : curveOffset;
        
        var innerRadius = mainRadius * innerScale;
        var pad = mainRadius - innerRadius;
        var diam = innerRadius * 2;
        
        const PI180 = Math.PI / 180;	
        const SEGS = 16;
        
        var theta = 360 / SEGS;
        var emoScale = (emotion - 0.5) * 2;
        
        var sides = [pad, pad + diam];
        var ct = [[0, 0], [0, 0]];
        
        ct[0][0] = innerRadius * Math.cos((theta * 3) * PI180) + pad ;
        ct[0][1] = innerRadius * Math.sin((theta * 3) * PI180) * emoScale + offsetY + pad - (curveOffset * mainRadius);
        
        ct[1][0] = innerRadius * Math.cos((theta * 5) * PI180) + pad + (innerRadius * 2);
        ct[1][1] = innerRadius * Math.sin((theta * 5) * PI180) * emoScale + offsetY + pad - (curveOffset * mainRadius);
        
        if (reverseX) {
            sides.reverse();
            ct.reverse();
        }
        
        context.moveTo(sides[0], offsetY + pad);
        context.bezierCurveTo(ct[0][0], ct[0][1], ct[1][0], ct[1][1], sides[1], offsetY + pad);
    }

    function drawEyeBrows(context, x1, y1, x2, y2, width, distance, emotion) {
        var a = (emotion - 0.5) * 30;
        var hW = width * 0.5;
        
        var l1 = rotZ(-hW, -distance, -a);
        var l2 = rotZ(hW , -distance, -a);
        
        var r1 = rotZ(-hW, -distance, a);
        var r2 = rotZ(hW , -distance, a);
        
        context.moveTo(l1[0] + x1, l1[1] + y1);
        context.lineTo(l2[0] + x1, l2[1] + y1);
        
        context.moveTo(r1[0] + x2, r1[1] + y2);
        context.lineTo(r2[0] + x2, r2[1] + y2);
    }

    function rotZ(x, y, angle) {
        var cos = Math.cos(angle * PI180);
        var sin = Math.sin(angle * PI180);
        var tx = x * cos - y * sin;
        var ty = x * sin + y * cos;
        return [tx, ty];
    }
    
    //////////////////////////////////////////////////////////////
    // utils
    
    function cap(t, mi, ma) {
        if (t < mi) return mi
        if (t > ma) return ma
        return t
    }

    function lerp(t0, v0, t1, v1, t) {
        return (t - t0) * (v1 - v0) / (t1 - t0) + v0
    }
    
    function getPos(e) {
        var x = 0, y = 0
        while (e != null) {
            x += e.offsetLeft
            y += e.offsetTop
            e = e.offsetParent
        }
        return {x : x, y : x}
    }
    
    function getRelPos(to, event) {
        var pos = getPos(to)
        return {
            x : event.pageX - pos.x,
            y : event.pageY - pos.y
        }
    }
}

