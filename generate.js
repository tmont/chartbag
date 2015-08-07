var fs = require('fs');

function roundProperly(value, exp) {
	var divider = Math.pow(10, Math.abs(exp));
	if (exp > 0) {
		divider = 10;
	}

	return Math.round(value * divider) / divider;
}

function generateRandomData(length) {
	var values = [];
	var xValues = {};

	for (var i = 0; i < length; i++) {
		var yCoefficient = Math.random() > 0.5 ? -1 : 1;
		var y = Math.round(Math.random() * 10) / 10 * yCoefficient,
			x;

		do {
			x = Math.round(Math.random() * 90);
		} while (xValues[x]);

		xValues[x] = 1;

		values.push([ x, y ]);
	}

	values.sort(function(a, b) {
		if (a[0] === b[0]) {
			return 0;
		}

		return a[0] < b[0] ? -1 : 1;
	});
	return values;
}

function oneTrueMod(value, mod) {
	return (mod + (value % mod)) % mod;
}

var params = {
	//title: 'Line Graph Test',
	type: 'line',
	width: 600,
	height: 350,
	data: [
		{
			color: 'blue',
			label: 'Windows',
			area: false,
			values: generateRandomData(10)
		},
		{
			color: 'magenta',
			label: 'Ubuntu',
			area: false,
			values: generateRandomData(10)
		}
	],
	yAxis: {
		color: 'black',
		//label: 'Count',
		grid: true
	},
	xAxis: {
		color: 'black',
		//label: 'Time (seconds)',
		grid: true
	},
	legend: false
};

console.log(require('util').inspect(params.data, false, null, true));

var colorMap = {
	blue: [ '#3333CC', '#000066' ],
	magenta: [ '#CC33CC', '#663366' ],
	black: [ '#363636', '#000000' ]
};

function getOptimalDomain(values, length) {
	var max = values.reduce(function(max, next) {
		return Math.max(max, next);
	}, -Infinity);
	var min = values.reduce(function(min, next) {
		return Math.min(min, next);
	}, Infinity);

	var diff = max - min;
	var optimalNumSteps = Math.ceil(Math.sqrt(length) / 2.5);
	var exactStep = diff / optimalNumSteps;
	var exponent = Math.round(Math.log(exactStep) / Math.log(10));
	var step = Math.pow(10, exponent);
	var numSteps = diff / step;
	step = step * Math.round(numSteps / optimalNumSteps);

	return {
		min: min - oneTrueMod(min, step),
		max: max + (step - oneTrueMod(max, step)),
		step: step,
		diff: diff,
		numSteps: numSteps,
		optimalSteps: optimalNumSteps,
		exp: exponent,
		exactStep: exactStep
	};
}

function pluck(values, index) {
	return values.reduce(function(values, next) {
		next.values.forEach(function(point) {
			values.push(point[index]);
		});
		return values;
	}, []);
}

var xValues = pluck(params.data, 0);
var yValues = pluck(params.data, 1);
var xDomain = getOptimalDomain(xValues, params.width);
var yDomain = getOptimalDomain(yValues, params.height);

console.log(require('util').inspect(xDomain, false, null, true));
console.log(require('util').inspect(yDomain, false, null, true));

function createLineChart(data, xDomain, yDomain) {
	var indentValue = 0,
		svg = '';

	function indent() {
		indentValue++;
		ln();
	}
	function ln() {
		svg += '\n';
	}
	function dedent() {
		indentValue--;
		ln();
	}

	function open(name, attributes, close) {
		var tag = '<' + name;
		if (attributes && Object.keys(attributes).length) {
			tag += ' ' + Object.keys(attributes).map(function(key) {
				return key + '="' + attributes[key] + '"';
			}).join(' ');
		}

		tag += (close ? '/>' : '>');
		svg += new Array(indentValue + 1).join('  ') + tag;
	}

	function close(name) {
		svg += '</' + name + '>';
	}

	function write(value) {
		svg += value;
	}

	var margin = 20,
		titleHeight = data.title ? 40 : 0,
		yAxisGutter = 50,
		xAxisGutter = 25,
		xAxisLabelHeight = data.xAxis.label ? 30 : 0,
		yAxisLabelWidth = data.yAxis.label ? 40: 0,
		chartWidth = data.width,
		chartHeight = data.height,
		legendWidth = data.legend ? 150 : 0,
		totalWidth = margin + yAxisGutter + yAxisLabelWidth + chartWidth + legendWidth + margin,
		totalHeight = margin + titleHeight + chartHeight + xAxisGutter + xAxisLabelHeight + margin,
		chartOrigin = {
			x: margin + yAxisLabelWidth + yAxisGutter,
			y: margin + titleHeight + chartHeight
		};

	open('svg', {
		version: 1.1,
		baseProfile: 'full',
		width: totalWidth,
		height: totalHeight,
		xmlns: 'http://www.w3.org/2000/svg'
	});
	indent();

	//x axis
	open('line', {
		stroke: data.xAxis.color || 'black',
		'stroke-width': 2,
		x1: chartOrigin.x,
		y1: chartOrigin.y,
		x2: chartOrigin.x + chartWidth,
		y2: chartOrigin.y
	}, true);
	ln();

	//y axis
	open('line', {
		stroke: data.yAxis.color || 'black',
		'stroke-width': 2,
		x1: chartOrigin.x,
		y1: chartOrigin.y,
		x2: chartOrigin.x,
		y2: chartOrigin.y - chartHeight
	}, true);
	ln();

	//title
	if (data.title) {
		open('text', {
			x: chartOrigin.x + (chartWidth / 2),
			y: margin + (titleHeight * 3 / 4),
			'font-size': 24,
			'font-family': 'sans-serif',
			'text-anchor': 'middle'
		});
		write(data.title);
		close('text');
		ln();
	}

	//x axis labels
	var xSteps = Math.ceil((xDomain.max - xDomain.min) / xDomain.step),
		xDomainStepWidth = chartWidth / xSteps / xDomain.step;

	open('g', {
		'font-size': 14,
		'font-family': 'sans-serif'
	});
	indent();



	for (var i = xDomain.min; i <= xDomain.max; i += xDomain.step) {
		i = roundProperly(i, xDomain.exp);
		open('text', {
			x: margin + yAxisLabelWidth + yAxisGutter + ((i - xDomain.min) * xDomainStepWidth),
			y: margin + titleHeight + chartHeight + (xAxisGutter * 3 / 4),
			'text-anchor' :'middle'
		});
		write(i);
		close('text');
		ln();

		if (i > xDomain.min && i < xDomain.max && data.yAxis.grid) {
			open('line', {
				x1: chartOrigin.x + ((i - xDomain.min) * xDomainStepWidth),
				y1: margin + titleHeight + chartHeight,
				x2: chartOrigin.x + ((i - xDomain.min) * xDomainStepWidth),
				y2: margin + titleHeight,
				stroke: 'black',
				'stroke-opacity': 0.2,
				'stroke-width': 1
			}, true);
			ln();
		}
	}

	//y axis steps
	var ySteps = Math.ceil((yDomain.max - yDomain.min) / yDomain.step),
		yDomainStepHeight = chartHeight / ySteps / yDomain.step;
	for (var i = yDomain.min; i <= yDomain.max; i += yDomain.step) {
		i = roundProperly(i, yDomain.exp);
		open('text', {
			x: margin + yAxisLabelWidth + (yAxisGutter / 2),
			y: margin + titleHeight + chartHeight - ((i - yDomain.min) * yDomainStepHeight),
			'text-anchor': 'middle',
			dy: '.3em'
		});
		write(i);
		close('text');
		ln();

		if (i > yDomain.min && i < yDomain.max && data.xAxis.grid) {
			open('line', {
				x1: chartOrigin.x,
				y1: margin + titleHeight + chartHeight - ((i - yDomain.min) * yDomainStepHeight),
				x2: chartOrigin.x + chartWidth,
				y2: margin + titleHeight + chartHeight - ((i - yDomain.min) * yDomainStepHeight),
				stroke: 'black',
				'stroke-opacity': 0.2,
				'stroke-width': 1
			}, true);
			ln();
		}
	}
	close('g');
	ln();

	function translatePoint(point) {
		var x = point[0],
			y = point[1];

		x = chartOrigin.x + chartWidth * ((x - xDomain.min) / xSteps) / xDomain.step;
		y = chartOrigin.y - chartHeight * ((y - yDomain.min) / ySteps) / yDomain.step;

		return [ x, y ];
	}

	function getColor(name, index) {
		var colors = {
			0: 'blue',
			1: 'red',
			2: 'green',
			3: 'yellow',
			4: 'purple',
			5: 'black'
		};

		var color = colors[index];
		return colorMap[name] || colorMap[color] || colorMap.black;
	}

	data.data.forEach(function(lineData, i) {
		var realPoints = lineData.values
			.map(function(point) {
				return translatePoint(point);
			});

		var path = realPoints
			.map(function(point, i) {
				if (i === 0) {
					return 'M ' + point.join(',');
				}

				return 'L ' + point.join(',');
			});

		var polygonPoints = realPoints
			.concat([
				[ realPoints[realPoints.length - 1][0], chartOrigin.y ], //straight down from last point
				[ realPoints[0][0], chartOrigin.y ] //straight down from first point
			])

			.map(function(point) {
				return point.join(',');
			})
			.join(' ');

		var color = getColor(lineData.color, i);
		open('path', {
			d: path.join(' '),
			stroke: color[0],
			'stroke-width': 2,
			fill: 'none',
			filter: 'url(#dropShadow)'
		}, true);
		ln();

		if (lineData.area) {
			open('polygon', {
				points: polygonPoints,
				'stroke-width': 0,
				fill: 'url(#line-grad-' + i + ')',
				'fill-opacity': 0.5
			}, true);
			ln();
		}
	});

	//x-axis label
	if (data.xAxis.label) {
		open('text', {
			x: margin + yAxisLabelWidth + yAxisGutter + (chartWidth / 2),
			y: margin + titleHeight + chartHeight + xAxisGutter + (xAxisLabelHeight * 3 / 4),
			'font-size': 16,
			'text-anchor': 'middle',
			'font-family': 'sans-serif'
		});
		write(data.xAxis.label);
		close('text');
		ln();
	}
	//y-axis label
	if (data.yAxis.label) {
		var yLabel = {
			x: margin + (yAxisLabelWidth * 3 / 4),
			y: margin + titleHeight + (chartHeight / 2)
		};
		open('text', {
			x: yLabel.x,
			y: yLabel.y,
			'font-size': 16,
			'text-anchor': 'middle',
			transform: 'rotate(270, ' + yLabel.x + ',' + yLabel.y + ')',
			'font-family': 'sans-serif'
		});
		write(data.yAxis.label);
		close('text');
		ln();
	}

	//legend
	if (data.legend) {
		var legend = {
			x: chartOrigin.x + chartWidth,
			y: margin + titleHeight
		};

		open('defs'); indent();
		data.data.forEach(function(data, i) {
			var color = getColor(data.color, i);
			open('linearGradient', {
				id: 'line-grad-' + i,
				x1: 0,
				x2: 0,
				y1: 0,
				y2: 1
			}); indent();

			open('stop', {
				offset: '0%',
				'stop-color': color[0]
			}, true); ln();
			open('stop', {
				offset: '100%',
				'stop-color': color[1]
			}, true);
			ln();

			close('linearGradient'); dedent();
		});
		close('defs'); dedent();

		data.data.forEach(function(data, i) {
			var padding = margin / 2,
				rectWidth = 20,
				rectHeight = 20,
				x = legend.x + padding,
				y = legend.y + padding + (i * rectHeight * 1.5);

			open('rect', {
				x: x,
				y: y,
				rx: 2,
				ry: 2,
				width: rectWidth,
				height: rectHeight,
				fill: 'url(#line-grad-' + i + ')'
			}, true);
			ln();
			open('text', {
				x: x + rectWidth + padding,
				y: y + (rectHeight * 3 / 4),
				'font-family': 'sans-serif',
				'font-size': 14
			});
			write(data.label);
			close('text'); ln();
		});
	}

	var dropShadow = '<filter id="dropShadow">\n\
		<feGaussianBlur in="SourceAlpha" stdDeviation="2"/>\n\
		<feOffset dx="1" dy="2"/>\n\
		<feMerge>\n\
			<feMergeNode/>\n\
			<feMergeNode in="SourceGraphic"/>\n\
		</feMerge>\n\
	</filter>';

	write(dropShadow);

	dedent();
	close('svg');

	fs.writeFileSync('./generated.svg', svg);
}

createLineChart(params, xDomain, yDomain);
